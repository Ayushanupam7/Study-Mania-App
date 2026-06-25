import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useStore } from "../store/store";
import type { Note } from "../store/store";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Eye, 
  Edit3, 
  Clock,
  FileText,
  Square,
  Circle,
  ArrowUpRight,
  Undo2,
  Redo2,
  Type,
  Eraser,
  MousePointer,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Sparkles,
  Maximize2,
  Minimize2,
  ExternalLink,
  Sun,
  Moon
} from "lucide-react";

const NotesPage: React.FC = () => {
  const notes = useStore(state => state.notes);
  const addNote = useStore(state => state.addNote);
  const updateNote = useStore(state => state.updateNote);
  const deleteNote = useStore(state => state.deleteNote);
  const toggleTheme = useStore(state => state.toggleTheme);
  const darkMode = useStore(state => state.darkMode);

  const [activeNoteId, setActiveNoteId] = useState<string>(notes[0]?.id || "");
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  useEffect(() => {
    return () => {
      if (pipWindow) {
        pipWindow.close();
      }
    };
  }, [pipWindow]);

  // Sync theme with Floating Note PiP window
  useEffect(() => {
    if (pipWindow) {
      const themeClass = darkMode ? "dark" : "";
      pipWindow.document.documentElement.className = themeClass;
      pipWindow.document.body.className = `${themeClass} flex flex-col min-h-screen overflow-hidden m-0 p-3 font-sans transition-colors duration-300`;
      
      const bgColor = darkMode ? "#020617" : "#ffffff";
      pipWindow.document.documentElement.style.background = bgColor;
      pipWindow.document.body.style.background = bgColor;
    }
  }, [pipWindow, darkMode]);

  const togglePiP = async () => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
      return;
    }

    if (!('documentPictureInPicture' in window)) {
      alert("Floating Sticky Notes (Document Picture-in-Picture) is not supported in this browser. Please use Chrome or Edge on Desktop.");
      return;
    }

    try {
      const w = await (window as any).documentPictureInPicture.requestWindow({
        width: 320,
        height: 380,
      });

      // Copy style sheets by cloning the DOM nodes (cleaner & supports Tailwind v4 imports)
      [...document.querySelectorAll('style, link[rel="stylesheet"]')].forEach((el) => {
        w.document.head.appendChild(el.cloneNode(true));
      });

      const themeClass = darkMode ? "dark" : "";
      w.document.documentElement.className = themeClass;
      w.document.body.className = `${themeClass} flex flex-col min-h-screen overflow-hidden m-0 p-3 font-sans transition-colors duration-300`;
      
      const bgColor = darkMode ? "#020617" : "#ffffff";
      w.document.documentElement.style.background = bgColor;
      w.document.body.style.background = bgColor;

      w.addEventListener("pagehide", () => {
        setPipWindow(null);
      });

      setPipWindow(w);
    } catch (e) {
      console.error("Failed to open PiP window: ", e);
    }
  };
  const [editorMode, setEditorMode] = useState<"edit" | "preview" | "roadmap">("edit");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Roadmap canvas drawing states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [tool, setTool] = useState<"pencil" | "rectangle" | "circle" | "arrow" | "text" | "eraser" | "select">("pencil");
  const [color, setColor] = useState<string>("#6366f1");
  const [width, setWidth] = useState<number>(3);
  const [elements, setElements] = useState<any[]>([]);
  const [redoHistory, setRedoHistory] = useState<any[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState<any>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number; w: number; h: number; value: string } | null>(null);
  const [selectedElementIndex, setSelectedElementIndex] = useState<number | null>(null);
  const [originalElement, setOriginalElement] = useState<any | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [resizeHandle, setResizeHandle] = useState<"tl" | "tr" | "bl" | "br" | null>(null);
  const [pages, setPages] = useState<any[][]>([[]]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [fillStyle, setFillStyle] = useState<"none" | "semi" | "solid">("semi");

  const changeColor = (newColor: string) => {
    setColor(newColor);
    if (selectedElementIndex !== null) {
      const updated = [...elements];
      updated[selectedElementIndex] = {
        ...updated[selectedElementIndex],
        color: newColor
      };
      saveElements(updated, false);
    }
  };

  const changeWidth = (newWidth: number) => {
    setWidth(newWidth);
    if (selectedElementIndex !== null) {
      const updated = [...elements];
      updated[selectedElementIndex] = {
        ...updated[selectedElementIndex],
        width: newWidth
      };
      saveElements(updated, false);
    }
  };

  const changeFillStyle = (newFillStyle: "none" | "semi" | "solid") => {
    setFillStyle(newFillStyle);
    if (selectedElementIndex !== null) {
      const updated = [...elements];
      const el = updated[selectedElementIndex];
      if (el.type === "rectangle" || el.type === "circle") {
        updated[selectedElementIndex] = {
          ...el,
          fillStyle: newFillStyle
        };
        saveElements(updated, false);
      }
    }
  };

  // Focus the text input when it is created
  useEffect(() => {
    if (textInput && textInputRef.current) {
      textInputRef.current.focus();
      const timer = setTimeout(() => {
        textInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [textInput]);

  // Clear selection when changing tool
  useEffect(() => {
    setSelectedElementIndex(null);
    setOriginalElement(null);
    setDragStartPos(null);
    setResizeHandle(null);
  }, [tool]);

  // Sync canvas elements with active note's drawingData
  useEffect(() => {
    setRedoHistory([]);
    setTextInput(null);
    setSelectedElementIndex(null);
    setOriginalElement(null);
    setDragStartPos(null);
    setResizeHandle(null);
    setCurrentPageIndex(0);

    if (activeNote) {
      try {
        const parsed = activeNote.drawingData ? JSON.parse(activeNote.drawingData) : [[]];
        if (Array.isArray(parsed)) {
          if (parsed.length === 0) {
            setPages([[]]);
            setElements([]);
          } else if (!Array.isArray(parsed[0])) {
            setPages([parsed]);
            setElements(parsed);
          } else {
            setPages(parsed);
            setElements(parsed[0] || []);
          }
        } else {
          setPages([[]]);
          setElements([]);
        }
      } catch (e) {
        setPages([[]]);
        setElements([]);
      }
    } else {
      setPages([[]]);
      setElements([]);
    }
  }, [activeNoteId]);

  const saveElements = (newElements: any[], clearRedo: boolean = true) => {
    setElements(newElements);
    if (clearRedo) {
      setRedoHistory([]);
    }
    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = newElements;
    setPages(updatedPages);
    if (activeNote) {
      updateNote(activeNote.id, { drawingData: JSON.stringify(updatedPages) });
    }
  };

  const changePage = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= pages.length) return;
    
    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = elements;
    setPages(updatedPages);
    
    setTextInput(null);
    setSelectedElementIndex(null);
    setOriginalElement(null);
    setDragStartPos(null);
    setResizeHandle(null);
    setRedoHistory([]);
    
    setCurrentPageIndex(newIndex);
    setElements(updatedPages[newIndex] || []);
  };

  const addPage = () => {
    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = elements;
    
    updatedPages.push([]);
    setPages(updatedPages);
    
    if (activeNote) {
      updateNote(activeNote.id, { drawingData: JSON.stringify(updatedPages) });
    }
    
    setTextInput(null);
    setSelectedElementIndex(null);
    setOriginalElement(null);
    setDragStartPos(null);
    setResizeHandle(null);
    setRedoHistory([]);
    
    const newIndex = updatedPages.length - 1;
    setCurrentPageIndex(newIndex);
    setElements([]);
  };

  const deletePage = () => {
    if (pages.length <= 1) return;
    if (!window.confirm("Are you sure you want to delete this canvas page? All shapes on this page will be permanently lost.")) return;
    
    const updatedPages = pages.filter((_, idx) => idx !== currentPageIndex);
    setPages(updatedPages);
    
    if (activeNote) {
      updateNote(activeNote.id, { drawingData: JSON.stringify(updatedPages) });
    }
    
    const newIndex = Math.max(0, currentPageIndex - 1);
    
    setTextInput(null);
    setSelectedElementIndex(null);
    setOriginalElement(null);
    setDragStartPos(null);
    setResizeHandle(null);
    setRedoHistory([]);
    
    setCurrentPageIndex(newIndex);
    setElements(updatedPages[newIndex] || []);
  };

  const getStrokeColor = (col: string) => {
    if (col === "currentColor") {
      return darkMode ? "#f8fafc" : "#0f172a";
    }
    return col;
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    ctx.strokeStyle = darkMode ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)";
    ctx.lineWidth = 1;
    const gridSize = 20;

    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawElement = (ctx: CanvasRenderingContext2D, el: any) => {
    ctx.save();
    ctx.strokeStyle = getStrokeColor(el.color);
    ctx.lineWidth = el.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (el.type === "pencil") {
      if (el.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(el.points[0].x, el.points[0].y);
      for (let i = 1; i < el.points.length; i++) {
        ctx.lineTo(el.points[i].x, el.points[i].y);
      }
      ctx.stroke();
    } else if (el.type === "rectangle") {
      ctx.beginPath();
      ctx.rect(el.x, el.y, el.w, el.h);
      const fill = el.fillStyle || "semi";
      if (fill !== "none") {
        ctx.fillStyle = getStrokeColor(el.color) + (fill === "solid" ? "" : "25");
        ctx.fill();
      }
      ctx.stroke();
    } else if (el.type === "circle") {
      ctx.beginPath();
      ctx.ellipse(el.x, el.y, Math.abs(el.rx), Math.abs(el.ry), 0, 0, 2 * Math.PI);
      const fill = el.fillStyle || "semi";
      if (fill !== "none") {
        ctx.fillStyle = getStrokeColor(el.color) + (fill === "solid" ? "" : "25");
        ctx.fill();
      }
      ctx.stroke();
    } else if (el.type === "arrow") {
      ctx.beginPath();
      ctx.moveTo(el.x1, el.y1);
      ctx.lineTo(el.x2, el.y2);
      ctx.stroke();

      const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
      const arrowHeadSize = 12;
      ctx.beginPath();
      ctx.moveTo(el.x2, el.y2);
      ctx.lineTo(
        el.x2 - arrowHeadSize * Math.cos(angle - Math.PI / 6),
        el.y2 - arrowHeadSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(el.x2, el.y2);
      ctx.lineTo(
        el.x2 - arrowHeadSize * Math.cos(angle + Math.PI / 6),
        el.y2 - arrowHeadSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    } else if (el.type === "text") {
      ctx.fillStyle = getStrokeColor(el.color);
      const fontSizeNum = el.width === 2 ? 16 : el.width === 4 ? 24 : 36;
      ctx.font = `bold ${fontSizeNum}px sans-serif`;
      ctx.textBaseline = "top";
      
      const paragraphs = el.text.split("\n");
      const lineHeight = fontSizeNum * 1.25;
      let yOffset = 0;
      const boxWidth = el.w || 200;

      const wrapText = (textStr: string, maxWidth: number) => {
        const words = textStr.split(" ");
        const resultLines = [];
        let currentLine = words[0] || "";

        for (let i = 1; i < words.length; i++) {
          const word = words[i];
          const testWidth = ctx.measureText(currentLine + " " + word).width;
          if (testWidth < maxWidth) {
            currentLine += " " + word;
          } else {
            resultLines.push(currentLine);
            currentLine = word;
          }
        }
        resultLines.push(currentLine);
        return resultLines;
      };

      paragraphs.forEach((para: string) => {
        const lines = wrapText(para, boxWidth);
        lines.forEach((line: string) => {
          ctx.fillText(line, el.x, el.y + yOffset);
          yOffset += lineHeight;
        });
      });
    } else if (el.type === "text-box-preview") {
      ctx.save();
      ctx.strokeStyle = getStrokeColor(el.color);
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(el.x, el.y, el.w, el.h);
      ctx.restore();
    }
    ctx.restore();
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);
    elements.forEach(el => drawElement(ctx, el));

    if (isDrawing && currentElement) {
      drawElement(ctx, currentElement);
    }

    if (tool === "select" && selectedElementIndex !== null) {
      const el = elements[selectedElementIndex];
      if (el) {
        ctx.save();
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        
        let minX = 0, minY = 0, maxX = 0, maxY = 0;
        let showBox = false;

        if (el.type === "pencil") {
          if (el.points.length > 0) {
            minX = Math.min(...el.points.map((p: any) => p.x));
            maxX = Math.max(...el.points.map((p: any) => p.x));
            minY = Math.min(...el.points.map((p: any) => p.y));
            maxY = Math.max(...el.points.map((p: any) => p.y));
            showBox = true;
          }
        } else if (el.type === "rectangle") {
          minX = Math.min(el.x, el.x + el.w);
          maxX = Math.max(el.x, el.x + el.w);
          minY = Math.min(el.y, el.y + el.h);
          maxY = Math.max(el.y, el.y + el.h);
          showBox = true;
        } else if (el.type === "circle") {
          minX = el.x - Math.abs(el.rx);
          maxX = el.x + Math.abs(el.rx);
          minY = el.y - Math.abs(el.ry);
          maxY = el.y + Math.abs(el.ry);
          showBox = true;
        } else if (el.type === "arrow") {
          minX = Math.min(el.x1, el.x2);
          maxX = Math.max(el.x1, el.x2);
          minY = Math.min(el.y1, el.y2);
          maxY = Math.max(el.y1, el.y2);
          showBox = true;
        } else if (el.type === "text") {
          minX = el.x - 5;
          maxX = el.x + 145;
          minY = el.y - 5;
          maxY = el.y + 25;
          showBox = true;
        }

        if (showBox) {
          ctx.beginPath();
          ctx.rect(minX - 4, minY - 4, (maxX - minX) + 8, (maxY - minY) + 8);
          ctx.stroke();
          
          ctx.fillStyle = "#3b82f6";
          ctx.fillRect(minX - 7, minY - 7, 6, 6);
          ctx.fillRect(maxX + 1, minY - 7, 6, 6);
          ctx.fillRect(minX - 7, maxY + 1, 6, 6);
          ctx.fillRect(maxX + 1, maxY + 1, 6, 6);
        }
        ctx.restore();
      }
    }
  };

  // Redraw when elements, selection or editor mode changes
  useEffect(() => {
    if (editorMode === "roadmap") {
      redrawCanvas();
    }
  }, [elements, isDrawing, currentElement, darkMode, editorMode, selectedElementIndex, tool]);

  // Handle responsive resize of canvas resolution
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;

      canvas.width = parent.clientWidth || 800;
      canvas.height = parent.clientHeight || 450;
      redrawCanvas();
    };

    if (editorMode === "roadmap") {
      // Set dimensions
      setTimeout(resizeCanvas, 50);
      window.addEventListener("resize", resizeCanvas);
    }

    return () => window.removeEventListener("resize", resizeCanvas);
  }, [activeNoteId, editorMode, isFullscreen]);

  // Keyboard shortcuts for Undo/Redo/Delete/Nudge on the canvas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editorMode !== "roadmap") return;

      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase();
        if (tagName === "input" || tagName === "textarea" || tagName === "select" || activeEl.getAttribute("contenteditable") === "true") {
          return;
        }
      }

      // 1. Delete/Backspace key: delete selected shape
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedElementIndex !== null) {
          e.preventDefault();
          const updated = elements.filter((_, idx) => idx !== selectedElementIndex);
          saveElements(updated);
          setSelectedElementIndex(null);
        }
        return;
      }

      // 2. Escape key: deselect shape
      if (e.key === "Escape") {
        if (selectedElementIndex !== null) {
          e.preventDefault();
          setSelectedElementIndex(null);
        }
        return;
      }

      // 3. Arrow keys: nudge selected shape
      if (e.key.startsWith("Arrow") && selectedElementIndex !== null) {
        e.preventDefault();
        const nudgeAmount = e.shiftKey ? 10 : 2;
        let dx = 0;
        let dy = 0;
        if (e.key === "ArrowUp") dy = -nudgeAmount;
        else if (e.key === "ArrowDown") dy = nudgeAmount;
        else if (e.key === "ArrowLeft") dx = -nudgeAmount;
        else if (e.key === "ArrowRight") dx = nudgeAmount;

        const el = elements[selectedElementIndex];
        if (el) {
          let nudgedElement = { ...el };
          if (el.type === "pencil") {
            nudgedElement.points = el.points.map((p: any) => ({
              x: p.x + dx,
              y: p.y + dy
            }));
          } else if (el.type === "rectangle" || el.type === "circle" || el.type === "text") {
            nudgedElement.x = el.x + dx;
            nudgedElement.y = el.y + dy;
          } else if (el.type === "arrow") {
            nudgedElement.x1 = el.x1 + dx;
            nudgedElement.y1 = el.y1 + dy;
            nudgedElement.x2 = el.x2 + dx;
            nudgedElement.y2 = el.y2 + dy;
          }

          const updated = [...elements];
          updated[selectedElementIndex] = nudgedElement;
          saveElements(updated, false); // save nudged positions to database
        }
        return;
      }

      // 4. Plus/Minus keys: scale selected shape
      if ((e.key === "+" || e.key === "=" || e.key === "-") && selectedElementIndex !== null) {
        e.preventDefault();
        const scale = e.key === "-" ? 0.9 : 1.1;
        const el = elements[selectedElementIndex];
        if (el) {
          const box = getElementBoundingBox(el);
          const cx = (box.minX + box.maxX) / 2;
          const cy = (box.minY + box.maxY) / 2;

          let scaledElement = { ...el };
          if (el.type === "pencil") {
            scaledElement.points = el.points.map((p: any) => ({
              x: cx + (p.x - cx) * scale,
              y: cy + (p.y - cy) * scale
            }));
          } else if (el.type === "rectangle" || el.type === "circle") {
            scaledElement.x = cx + (el.x - cx) * scale;
            scaledElement.y = cy + (el.y - cy) * scale;
            if (el.type === "rectangle") {
              scaledElement.w = el.w * scale;
              scaledElement.h = el.h * scale;
            } else {
              scaledElement.rx = el.rx * scale;
              scaledElement.ry = el.ry * scale;
            }
          } else if (el.type === "arrow") {
            scaledElement.x1 = cx + (el.x1 - cx) * scale;
            scaledElement.y1 = cy + (el.y1 - cy) * scale;
            scaledElement.x2 = cx + (el.x2 - cx) * scale;
            scaledElement.y2 = cy + (el.y2 - cy) * scale;
          } else if (el.type === "text") {
            scaledElement.x = cx + (el.x - cx) * scale;
            scaledElement.y = cy + (el.y - cy) * scale;
            const newThickness = el.width * scale;
            if (newThickness <= 3) {
              scaledElement.width = 2;
            } else if (newThickness <= 6) {
              scaledElement.width = 4;
            } else {
              scaledElement.width = 8;
            }
          }

          const updated = [...elements];
          updated[selectedElementIndex] = scaledElement;
          saveElements(updated, false);
        }
        return;
      }

      // 5. Ctrl + Z / Y: Undo / Redo
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          handleUndo();
        } else if (e.key.toLowerCase() === "y") {
          e.preventDefault();
          handleRedo();
        }
      }

      // 6. Tool Selection Shortcuts (e.g. v, p, e, r, o/c, a/l, t)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === "v") {
          e.preventDefault();
          setTool("select");
        } else if (key === "p") {
          e.preventDefault();
          setTool("pencil");
        } else if (key === "e") {
          e.preventDefault();
          setTool("eraser");
        } else if (key === "r") {
          e.preventDefault();
          setTool("rectangle");
        } else if (key === "c" || key === "o") {
          e.preventDefault();
          setTool("circle");
        } else if (key === "a" || key === "l") {
          e.preventDefault();
          setTool("arrow");
        } else if (key === "t") {
          e.preventDefault();
          setTool("text");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editorMode, elements, redoHistory, selectedElementIndex, setTool]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  };

  const isPointClose = (x1: number, y1: number, x2: number, y2: number, threshold = 15) => {
    return Math.hypot(x1 - x2, y1 - y2) < threshold;
  };

  const isPointNearLine = (px: number, py: number, x1: number, y1: number, x2: number, y2: number, threshold = 15) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    return isPointClose(px, py, xx, yy, threshold);
  };

  const eraseElementsAt = (x: number, y: number) => {
    const threshold = 15;
    const remaining = elements.filter(el => {
      if (el.type === "pencil") {
        return !el.points.some((p: any) => isPointClose(x, y, p.x, p.y, threshold));
      } else if (el.type === "rectangle") {
        const left = el.x;
        const right = el.x + el.w;
        const top = el.y;
        const bottom = el.y + el.h;
        const xMin = Math.min(left, right);
        const xMax = Math.max(left, right);
        const yMin = Math.min(top, bottom);
        const yMax = Math.max(top, bottom);
        return !(
          isPointNearLine(x, y, xMin, yMin, xMax, yMin, threshold) ||
          isPointNearLine(x, y, xMax, yMin, xMax, yMax, threshold) ||
          isPointNearLine(x, y, xMax, yMax, xMin, yMax, threshold) ||
          isPointNearLine(x, y, xMin, yMax, xMin, yMin, threshold)
        );
      } else if (el.type === "circle") {
        const dx = x - el.x;
        const dy = y - el.y;
        const rx = Math.abs(el.rx) + threshold;
        const ry = Math.abs(el.ry) + threshold;
        if (rx === 0 || ry === 0) return !isPointClose(x, y, el.x, el.y, threshold);
        const term = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
        return term > 1.0;
      } else if (el.type === "arrow") {
        return !isPointNearLine(x, y, el.x1, el.y1, el.x2, el.y2, threshold);
      } else if (el.type === "text") {
        return !(x >= el.x - 10 && x <= el.x + 150 && y >= el.y - 10 && y <= el.y + 30);
      }
      return true;
    });

    if (remaining.length !== elements.length) {
      saveElements(remaining);
    }
  };

  const getElementBoundingBox = (el: any) => {
    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    if (el.type === "pencil") {
      if (el.points.length > 0) {
        minX = Math.min(...el.points.map((p: any) => p.x));
        maxX = Math.max(...el.points.map((p: any) => p.x));
        minY = Math.min(...el.points.map((p: any) => p.y));
        maxY = Math.max(...el.points.map((p: any) => p.y));
      }
    } else if (el.type === "rectangle") {
      minX = Math.min(el.x, el.x + el.w);
      maxX = Math.max(el.x, el.x + el.w);
      minY = Math.min(el.y, el.y + el.h);
      maxY = Math.max(el.y, el.y + el.h);
    } else if (el.type === "circle") {
      minX = el.x - Math.abs(el.rx);
      maxX = el.x + Math.abs(el.rx);
      minY = el.y - Math.abs(el.ry);
      maxY = el.y + Math.abs(el.ry);
    } else if (el.type === "arrow") {
      minX = Math.min(el.x1, el.x2);
      maxX = Math.max(el.x1, el.x2);
      minY = Math.min(el.y1, el.y2);
      maxY = Math.max(el.y1, el.y2);
    } else if (el.type === "text") {
      minX = el.x - 5;
      maxX = el.x + 145;
      minY = el.y - 5;
      maxY = el.y + 25;
    }
    return { minX, minY, maxX, maxY };
  };

  const getResizeHandleAtPosition = (x: number, y: number, el: any): "tl" | "tr" | "bl" | "br" | null => {
    const { minX, minY, maxX, maxY } = getElementBoundingBox(el);
    const handleSize = 10;
    if (isPointClose(x, y, minX, minY, handleSize)) return "tl";
    if (isPointClose(x, y, maxX, minY, handleSize)) return "tr";
    if (isPointClose(x, y, minX, maxY, handleSize)) return "bl";
    if (isPointClose(x, y, maxX, maxY, handleSize)) return "br";
    return null;
  };

  const getElementAtPosition = (x: number, y: number): number => {
    const threshold = 15;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === "pencil") {
        if (el.points.some((p: any) => isPointClose(x, y, p.x, p.y, threshold))) return i;
      } else if (el.type === "rectangle") {
        const left = el.x;
        const right = el.x + el.w;
        const top = el.y;
        const bottom = el.y + el.h;
        const xMin = Math.min(left, right);
        const xMax = Math.max(left, right);
        const yMin = Math.min(top, bottom);
        const yMax = Math.max(top, bottom);
        
        const isInside = x >= xMin && x <= xMax && y >= yMin && y <= yMax;
        const isNearBorder = (
          isPointNearLine(x, y, xMin, yMin, xMax, yMin, threshold) ||
          isPointNearLine(x, y, xMax, yMin, xMax, yMax, threshold) ||
          isPointNearLine(x, y, xMax, yMax, xMin, yMax, threshold) ||
          isPointNearLine(x, y, xMin, yMax, xMin, yMin, threshold)
        );
        if (isInside || isNearBorder) return i;
      } else if (el.type === "circle") {
        const dx = x - el.x;
        const dy = y - el.y;
        const rx = Math.abs(el.rx);
        const ry = Math.abs(el.ry);
        if (rx === 0 || ry === 0) {
          if (isPointClose(x, y, el.x, el.y, threshold)) return i;
        } else {
          const term = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
          if (term <= 1.1) return i;
        }
      } else if (el.type === "arrow") {
        if (isPointNearLine(x, y, el.x1, el.y1, el.x2, el.y2, threshold)) return i;
      } else if (el.type === "text") {
        const isInside = x >= el.x - 10 && x <= el.x + 150 && y >= el.y - 10 && y <= el.y + 30;
        if (isInside) return i;
      }
    }
    return -1;
  };

  const commitTextInput = (customInputState?: typeof textInput) => {
    const inputToCommit = customInputState || textInput;
    if (inputToCommit && inputToCommit.value.trim() !== "") {
      const newElement = {
        type: "text",
        x: inputToCommit.x,
        y: inputToCommit.y,
        w: inputToCommit.w,
        h: inputToCommit.h,
        text: inputToCommit.value,
        color,
        width
      };
      saveElements([...elements, newElement]);
    }
    setTextInput(null);
  };

  const handleStart = (x: number, y: number) => {
    if (tool === "text") {
      if (textInput) {
        commitTextInput();
        return;
      }
      setIsDrawing(true);
      setDragStartPos({ x, y });
      setCurrentElement({
        type: "text-box-preview",
        x,
        y,
        w: 0,
        h: 0,
        color,
        width
      });
      return;
    }
    if (tool === "eraser") {
      setIsDrawing(true);
      eraseElementsAt(x, y);
      return;
    }
    if (tool === "select") {
      if (selectedElementIndex !== null) {
        const el = elements[selectedElementIndex];
        if (el) {
          const handle = getResizeHandleAtPosition(x, y, el);
          if (handle) {
            setIsDrawing(true);
            setResizeHandle(handle);
            setOriginalElement(el);
            setDragStartPos({ x, y });
            return;
          }
        }
      }

      const index = getElementAtPosition(x, y);
      if (index !== -1) {
        setIsDrawing(true);
        setSelectedElementIndex(index);
        const selectedEl = elements[index];
        setOriginalElement(selectedEl);
        setDragStartPos({ x, y });
        
        // Sync toolbar settings with selected shape properties
        if (selectedEl.color) setColor(selectedEl.color);
        if (selectedEl.width) setWidth(selectedEl.width);
        if (selectedEl.type === "rectangle" || selectedEl.type === "circle") {
          setFillStyle(selectedEl.fillStyle || "semi");
        }
      } else {
        setSelectedElementIndex(null);
      }
      return;
    }
    setIsDrawing(true);
    if (tool === "pencil") {
      setCurrentElement({
        type: "pencil",
        points: [{ x, y }],
        color,
        width
      });
    } else if (tool === "rectangle") {
      setCurrentElement({
        type: "rectangle",
        x,
        y,
        w: 0,
        h: 0,
        color,
        width,
        fillStyle
      });
    } else if (tool === "circle") {
      setCurrentElement({
        type: "circle",
        x,
        y,
        rx: 0,
        ry: 0,
        color,
        width,
        fillStyle
      });
    } else if (tool === "arrow") {
      setCurrentElement({
        type: "arrow",
        x1: x,
        y1: y,
        x2: x,
        y2: y,
        color,
        width
      });
    }
  };

  const handleMove = (x: number, y: number, shiftKey = false) => {
    if (!isDrawing) return;

    if (tool === "eraser") {
      eraseElementsAt(x, y);
      return;
    }

    if (tool === "select") {
      if (selectedElementIndex !== null && originalElement && dragStartPos) {
        let dx = x - dragStartPos.x;
        let dy = y - dragStartPos.y;
        
        if (resizeHandle) {
          const originalBox = getElementBoundingBox(originalElement);
          const originalW = originalBox.maxX - originalBox.minX;
          const originalH = originalBox.maxY - originalBox.minY;

          if (originalW === 0 || originalH === 0) return;

          let newMinX = originalBox.minX;
          let newMinY = originalBox.minY;
          let newMaxX = originalBox.maxX;
          let newMaxY = originalBox.maxY;

          if (resizeHandle === "br") {
            newMaxX = originalBox.maxX + dx;
            newMaxY = originalBox.maxY + dy;
          } else if (resizeHandle === "tl") {
            newMinX = originalBox.minX + dx;
            newMinY = originalBox.minY + dy;
          } else if (resizeHandle === "tr") {
            newMaxX = originalBox.maxX + dx;
            newMinY = originalBox.minY + dy;
          } else if (resizeHandle === "bl") {
            newMinX = originalBox.minX + dx;
            newMaxY = originalBox.maxY + dy;
          }

          let newW = newMaxX - newMinX;
          let newH = newMaxY - newMinY;
          if (newW < 5 || newH < 5) return;

          let scaleX = newW / originalW;
          let scaleY = newH / originalH;

          if (shiftKey) {
            const scale = Math.max(scaleX, scaleY);
            scaleX = scale;
            scaleY = scale;
            newW = originalW * scaleX;
            newH = originalH * scaleY;
            if (resizeHandle === "br") {
              newMaxX = newMinX + newW;
              newMaxY = newMinY + newH;
            } else if (resizeHandle === "tl") {
              newMinX = newMaxX - newW;
              newMinY = newMaxY - newH;
            } else if (resizeHandle === "tr") {
              newMaxX = newMinX + newW;
              newMinY = newMaxY - newH;
            } else if (resizeHandle === "bl") {
              newMinX = newMaxX - newW;
              newMaxY = newMinY + newH;
            }
          }

          let resizedElement = { ...originalElement };

          if (originalElement.type === "pencil") {
            resizedElement.points = originalElement.points.map((p: any) => ({
              x: newMinX + (p.x - originalBox.minX) * scaleX,
              y: newMinY + (p.y - originalBox.minY) * scaleY
            }));
          } else if (originalElement.type === "rectangle" || originalElement.type === "circle") {
            resizedElement.x = newMinX + (originalElement.x - originalBox.minX) * scaleX;
            resizedElement.y = newMinY + (originalElement.y - originalBox.minY) * scaleY;
            if (originalElement.type === "rectangle") {
              resizedElement.w = originalElement.w * scaleX;
              resizedElement.h = originalElement.h * scaleY;
            } else {
              resizedElement.rx = originalElement.rx * scaleX;
              resizedElement.ry = originalElement.ry * scaleY;
            }
          } else if (originalElement.type === "arrow") {
            resizedElement.x1 = newMinX + (originalElement.x1 - originalBox.minX) * scaleX;
            resizedElement.y1 = newMinY + (originalElement.y1 - originalBox.minY) * scaleY;
            resizedElement.x2 = newMinX + (originalElement.x2 - originalBox.minX) * scaleX;
            resizedElement.y2 = newMinY + (originalElement.y2 - originalBox.minY) * scaleY;
          } else if (originalElement.type === "text") {
            resizedElement.x = newMinX + (originalElement.x - originalBox.minX) * scaleX;
            resizedElement.y = newMinY + (originalElement.y - originalBox.minY) * scaleY;
            resizedElement.w = (originalElement.w || 200) * scaleX;
            resizedElement.h = (originalElement.h || 100) * scaleY;
            
            const avgScale = (scaleX + scaleY) / 2;
            const newThickness = originalElement.width * avgScale;
            if (newThickness <= 3) {
              resizedElement.width = 2;
            } else if (newThickness <= 6) {
              resizedElement.width = 4;
            } else {
              resizedElement.width = 8;
            }
          }

          const updated = [...elements];
          updated[selectedElementIndex] = resizedElement;
          setElements(updated);
        } else {
          if (shiftKey) {
            if (Math.abs(dx) > Math.abs(dy)) {
              dy = 0;
            } else {
              dx = 0;
            }
          }
          let movedElement = { ...originalElement };
          if (originalElement.type === "pencil") {
            movedElement.points = originalElement.points.map((p: any) => ({
              x: p.x + dx,
              y: p.y + dy
            }));
          } else if (originalElement.type === "rectangle" || originalElement.type === "circle" || originalElement.type === "text") {
            movedElement.x = originalElement.x + dx;
            movedElement.y = originalElement.y + dy;
          } else if (originalElement.type === "arrow") {
            movedElement.x1 = originalElement.x1 + dx;
            movedElement.y1 = originalElement.y1 + dy;
            movedElement.x2 = originalElement.x2 + dx;
            movedElement.y2 = originalElement.y2 + dy;
          }

          const updated = [...elements];
          updated[selectedElementIndex] = movedElement;
          setElements(updated);
        }
      }
      return;
    }

    if (!currentElement) return;

    if (tool === "pencil") {
      setCurrentElement((prev: any) => {
        if (shiftKey && prev.points.length > 0) {
          const start = prev.points[0];
          const dx = x - start.x;
          const dy = y - start.y;
          const angle = Math.atan2(dy, dx);
          const distance = Math.hypot(dx, dy);
          const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          const targetX = start.x + distance * Math.cos(snappedAngle);
          const targetY = start.y + distance * Math.sin(snappedAngle);
          return {
            ...prev,
            points: [start, { x: targetX, y: targetY }]
          };
        } else {
          return {
            ...prev,
            points: [...prev.points, { x, y }]
          };
        }
      });
    } else if (tool === "text") {
      setCurrentElement((prev: any) => ({
        ...prev,
        w: x - prev.x,
        h: y - prev.y
      }));
    } else if (tool === "rectangle") {
      setCurrentElement((prev: any) => {
        let w = x - prev.x;
        let h = y - prev.y;
        if (shiftKey) {
          const side = Math.max(Math.abs(w), Math.abs(h));
          w = Math.sign(w) * side;
          h = Math.sign(h) * side;
        }
        return { ...prev, w, h };
      });
    } else if (tool === "circle") {
      setCurrentElement((prev: any) => {
        let rx = x - prev.x;
        let ry = y - prev.y;
        if (shiftKey) {
          const r = Math.max(Math.abs(rx), Math.abs(ry));
          rx = Math.sign(rx) * r;
          ry = Math.sign(ry) * r;
        }
        return { ...prev, rx, ry };
      });
    } else if (tool === "arrow") {
      setCurrentElement((prev: any) => {
        let targetX = x;
        let targetY = y;
        if (shiftKey) {
          const dx = x - prev.x1;
          const dy = y - prev.y1;
          const angle = Math.atan2(dy, dx);
          const distance = Math.hypot(dx, dy);
          const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          targetX = prev.x1 + distance * Math.cos(snappedAngle);
          targetY = prev.y1 + distance * Math.sin(snappedAngle);
        }
        return { ...prev, x2: targetX, y2: targetY };
      });
    }
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (tool === "eraser") return;
    if (tool === "select") {
      if (selectedElementIndex !== null && dragStartPos) {
        saveElements(elements);
      }
      setOriginalElement(null);
      setDragStartPos(null);
      setResizeHandle(null);
      return;
    }
    if (tool === "text") {
      if (dragStartPos && currentElement) {
        const w = Math.abs(currentElement.w);
        const h = Math.abs(currentElement.h);
        const left = Math.min(currentElement.x, currentElement.x + currentElement.w);
        const top = Math.min(currentElement.y, currentElement.y + currentElement.h);
        
        const finalW = w > 10 ? w : 200;
        const finalH = h > 10 ? h : 100;
        
        setTextInput({ x: left, y: top, w: finalW, h: finalH, value: "" });
      }
      setCurrentElement(null);
      return;
    }
    if (!currentElement) return;
    saveElements([...elements, currentElement]);
    setCurrentElement(null);
  };

  const handleUndo = () => {
    if (elements.length > 0) {
      const lastElement = elements[elements.length - 1];
      const updated = elements.slice(0, -1);
      setRedoHistory(prev => [...prev, lastElement]);
      saveElements(updated, false);
    }
  };

  const handleRedo = () => {
    if (redoHistory.length > 0) {
      const nextElement = redoHistory[redoHistory.length - 1];
      const updatedRedo = redoHistory.slice(0, -1);
      setRedoHistory(updatedRedo);
      saveElements([...elements, nextElement], false);
    }
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear this roadmap?")) {
      saveElements([]);
    }
  };

  const activeNote = notes.find(n => n.id === activeNoteId) || notes[0];

  const handleCreate = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: "Untitled Note",
      content: "# Untitled Note\n\nWrite your thoughts, calculus sheets, or code blueprints here...",
      category: "Study",
      color: ["sky", "purple", "amber", "emerald", "rose"][Math.floor(Math.random() * 5)],
      updatedAt: new Date().toISOString()
    };
    addNote(newNote);
    setActiveNoteId(newNote.id);
  };

  const handleFieldChange = (fields: Partial<Note>) => {
    if (activeNote) {
      updateNote(activeNote.id, fields);
    }
  };

  const getCardColor = (colorName: string) => {
    switch (colorName) {
      case "sky": return "border-l-sky-500 hover:bg-sky-500/5";
      case "purple": return "border-l-purple-500 hover:bg-purple-500/5";
      case "amber": return "border-l-amber-500 hover:bg-amber-500/5";
      case "emerald": return "border-l-emerald-500 hover:bg-emerald-500/5";
      default: return "border-l-rose-500 hover:bg-rose-500/5";
    }
  };

  return (
    <div className="space-y-8">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md pt-6 pb-4 md:pt-8 lg:pt-10 z-20 -mx-4 px-4 md:-mx-8 md:px-8 lg:-mx-10 lg:px-10 border-b border-slate-200/30 dark:border-slate-800/30 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2 tracking-tight">
            <BookOpen className="text-sky-500 h-8 w-8" />
            <span>Scholar Notes</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Write rich markdown notes. Sync instantly, level up, and earn +10 XP for every note created.
          </p>
        </div>
        
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-tr from-sky-400 to-blue-500 hover:opacity-90 text-white font-bold text-sm shadow-md shadow-blue-500/10"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>New Note</span>
        </button>
      </div>

      {/* Editor Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch min-h-[500px]">
        {/* Left Notes List (Col 4) */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          <div className="glass-card p-4 rounded-3xl flex-1 flex flex-col min-h-[300px]">
            <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-3 px-1">
              My Notebook ({notes.length})
            </h3>
            
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {notes.length === 0 ? (
                <div className="text-center text-gray-400 text-xs py-8">
                  No notes found. Create your first note!
                </div>
              ) : (
                notes.map(n => (
                  <button
                    key={n.id}
                    onClick={() => setActiveNoteId(n.id)}
                    className={`w-full p-3.5 rounded-2xl border-l-4 text-left transition-all flex flex-col gap-1.5 ${
                      activeNoteId === n.id
                        ? "bg-slate-100 dark:bg-slate-800/80 border-l-sky-500"
                        : "bg-transparent border-l-slate-200 dark:border-l-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    } ${getCardColor(n.color)}`}
                  >
                    <div className="flex justify-between items-start gap-2 w-full">
                      <span className="font-bold text-sm truncate text-gray-800 dark:text-gray-200">
                        {n.title || "Untitled Note"}
                      </span>
                      <span className="text-[9px] uppercase font-extrabold bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-gray-500 shrink-0">
                        {n.category}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 truncate w-full">
                      {n.content.replace(/[#*`]/g, "").slice(0, 45) || "Empty note content..."}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Editor/Preview (Col 8) */}
        <div className="lg:col-span-8 flex flex-col">
          {activeNote ? (
            <div className={`transition-all duration-300 ${
              isFullscreen
                ? "fixed inset-0 z-50 bg-slate-100 dark:bg-slate-950 p-6 flex flex-col space-y-5 overflow-y-auto"
                : "glass-card p-6 rounded-3xl flex-1 flex flex-col space-y-5"
            }`}>
              {/* Note Metadata Fields */}
              <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={e => handleFieldChange({ title: e.target.value })}
                  placeholder="Note Title"
                  className="flex-1 text-xl font-extrabold bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-sky-500 focus:outline-none py-1.5 transition-all text-gray-900 dark:text-gray-100"
                />

                <div className="flex items-center gap-3 shrink-0">
                  {/* Category select */}
                  <select
                    value={activeNote.category}
                    onChange={e => handleFieldChange({ category: e.target.value })}
                    className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="Study">Study</option>
                    <option value="Ideas">Ideas</option>
                    <option value="Coding">Coding</option>
                    <option value="Personal">Personal</option>
                  </select>

                  {/* Mode Toggle Button */}
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      onClick={() => setEditorMode("edit")}
                      className={`p-1.5 rounded-lg transition-all ${
                        editorMode === "edit" ? "bg-white dark:bg-slate-900 text-sky-500 shadow-sm" : "text-gray-400"
                      }`}
                      title="Edit Note"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditorMode("preview")}
                      className={`p-1.5 rounded-lg transition-all ${
                        editorMode === "preview" ? "bg-white dark:bg-slate-900 text-sky-500 shadow-sm" : "text-gray-400"
                      }`}
                      title="Preview Note"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditorMode("roadmap")}
                      className={`p-1.5 rounded-lg transition-all ${
                        editorMode === "roadmap" ? "bg-white dark:bg-slate-900 text-sky-500 shadow-sm" : "text-gray-400"
                      }`}
                      title="Roadmap Canvas"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Fullscreen Toggle */}
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4.5 w-4.5" />
                    ) : (
                      <Maximize2 className="h-4.5 w-4.5" />
                    )}
                  </button>

                  {/* Floating Note Toggle */}
                  {('documentPictureInPicture' in window) && (
                    <button
                      onClick={togglePiP}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                        pipWindow 
                          ? "bg-sky-500/10 border-sky-500/30 text-sky-500" 
                          : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                      title={pipWindow ? "Close Floating Note" : "Open as Floating Sticky Note"}
                    >
                      <ExternalLink className="h-4.5 w-4.5" />
                    </button>
                  )}

                  {/* Delete note */}
                  <button
                    onClick={() => {
                      deleteNote(activeNote.id);
                      setActiveNoteId(notes.find(n => n.id !== activeNote.id)?.id || "");
                    }}
                    className="p-2 rounded-xl border border-rose-500/10 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Editing/Previewing Content Area */}
              <div className="flex-1 flex flex-col min-h-[350px]">
                {editorMode === "edit" ? (
                  <textarea
                    value={activeNote.content}
                    onChange={e => handleFieldChange({ content: e.target.value })}
                    placeholder="Start typing in Markdown..."
                    className="w-full flex-1 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none font-mono text-sm leading-relaxed text-slate-800 dark:text-slate-200"
                  />
                ) : editorMode === "preview" ? (
                  <div className={`w-full flex-1 p-5 border border-slate-100 dark:border-slate-800/80 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 overflow-y-auto ${
                    isFullscreen ? "max-h-full" : "max-h-[400px]"
                  }`}>
                    <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {activeNote.content || "*Empty note content. Type something to see the preview.*"}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col space-y-4">
                    {/* Drawing Toolbar */}
                    <div className="flex flex-wrap gap-4 items-center justify-between bg-slate-50 dark:bg-slate-900/55 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                      {/* Left: Tools Selection */}
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200/30 dark:border-slate-800/30">
                        <button
                          type="button"
                          onClick={() => setTool("select")}
                          className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            tool === "select" ? "bg-sky-500 text-white shadow-md shadow-sky-500/10" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                          title="Select & Move Shape"
                        >
                          <MousePointer className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Select</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTool("pencil")}
                          className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            tool === "pencil" ? "bg-sky-500 text-white shadow-md shadow-sky-500/10" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                          title="Pencil Drawing"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Pencil</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTool("rectangle")}
                          className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            tool === "rectangle" ? "bg-sky-500 text-white shadow-md shadow-sky-500/10" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                          title="Draw Milestone (Rectangle)"
                        >
                          <Square className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Milestone</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTool("circle")}
                          className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            tool === "circle" ? "bg-sky-500 text-white shadow-md shadow-sky-500/10" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                          title="Draw Node (Circle)"
                        >
                          <Circle className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Node</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTool("arrow")}
                          className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            tool === "arrow" ? "bg-sky-500 text-white shadow-md shadow-sky-500/10" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                          title="Draw Flow (Arrow)"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Arrow</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTool("text")}
                          className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            tool === "text" ? "bg-sky-500 text-white shadow-md shadow-sky-500/10" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                          title="Write Text"
                        >
                          <Type className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Text</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTool("eraser")}
                          className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            tool === "eraser" ? "bg-sky-500 text-white shadow-md shadow-sky-500/10" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                          title="Eraser tool"
                        >
                          <Eraser className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Eraser</span>
                        </button>
                      </div>

                      {/* Middle-Left: Page Selector */}
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200/30 dark:border-slate-800/30">
                        <button
                          type="button"
                          onClick={() => changePage(currentPageIndex - 1)}
                          disabled={currentPageIndex === 0}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                          title="Previous Page"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        
                        <span className="text-[10px] font-black px-1 text-slate-600 dark:text-slate-300 select-none">
                          Pg {currentPageIndex + 1} / {pages.length}
                        </span>

                        <button
                          type="button"
                          onClick={() => changePage(currentPageIndex + 1)}
                          disabled={currentPageIndex === pages.length - 1}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                          title="Next Page"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={addPage}
                          className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all cursor-pointer border-l border-slate-200 dark:border-slate-800"
                          title="Add Blank Page"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>

                        {pages.length > 1 && (
                          <button
                            type="button"
                            onClick={deletePage}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 dark:hover:text-rose-450 transition-all cursor-pointer"
                            title="Delete Current Page"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Middle: Color Palette */}
                      <div className="flex items-center gap-1.5">
                        {["#6366f1", "#0ea5e9", "#10b981", "#f43f5e", "#f59e0b", "currentColor"].map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => changeColor(c)}
                            className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                              color === c ? "ring-2 ring-sky-500 scale-110" : "hover:scale-105"
                            }`}
                            style={{
                              backgroundColor: c === "currentColor" ? (darkMode ? "#f8fafc" : "#0f172a") : c,
                              borderColor: c === "currentColor" ? (darkMode ? "#ffffff" : "#0f172a") : "transparent"
                            }}
                            title={c === "currentColor" ? "Theme Text Color" : c}
                          />
                        ))}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2">
                        {/* Thickness Selector */}
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200/30 dark:border-slate-800/30">
                          {[2, 4, 8].map(w => (
                            <button
                              key={w}
                              type="button"
                              onClick={() => changeWidth(w)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-all cursor-pointer ${
                                width === w ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              }`}
                            >
                              {w === 2 ? "Thin" : w === 4 ? "Mid" : "Thick"}
                            </button>
                          ))}
                        </div>

                        {/* Fill Style Selector */}
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200/30 dark:border-slate-800/30">
                          {(["none", "semi", "solid"] as const).map(f => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => changeFillStyle(f)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-all cursor-pointer ${
                                fillStyle === f ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              }`}
                            >
                              {f === "none" ? "Outline" : f === "semi" ? "Halftone" : "Solid"}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handleUndo}
                          disabled={elements.length === 0}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                          title="Undo (Ctrl+Z)"
                        >
                          <Undo2 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={handleRedo}
                          disabled={redoHistory.length === 0}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                          title="Redo (Ctrl+Y)"
                        >
                          <Redo2 className="h-4 w-4" />
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleClear}
                          disabled={elements.length === 0}
                          className="p-1.5 rounded-lg border border-rose-500/10 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                          title="Clear Roadmap"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Canvas Area */}
                    <div className={`relative border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden cursor-crosshair ${
                      isFullscreen ? "flex-1 min-h-[400px]" : "h-[450px]"
                    }`}>
                      <canvas
                        ref={canvasRef}
                        onMouseDown={e => {
                          const pos = getMousePos(e);
                          handleStart(pos.x, pos.y);
                        }}
                        onMouseMove={e => {
                          const pos = getMousePos(e);
                          handleMove(pos.x, pos.y, e.shiftKey);
                        }}
                        onMouseUp={handleEnd}
                        onMouseLeave={handleEnd}
                        onTouchStart={e => {
                          const pos = getTouchPos(e);
                          handleStart(pos.x, pos.y);
                        }}
                        onTouchMove={e => {
                          const pos = getTouchPos(e);
                          handleMove(pos.x, pos.y);
                        }}
                        onTouchEnd={handleEnd}
                        className="absolute inset-0 w-full h-full block"
                      />
                      
                      {textInput && (
                        <textarea
                          ref={textInputRef}
                          value={textInput.value}
                          onChange={e => setTextInput({ ...textInput, value: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              commitTextInput();
                            } else if (e.key === "Escape") {
                              setTextInput(null);
                            }
                          }}
                          onBlur={() => commitTextInput()}
                          onMouseDown={e => e.stopPropagation()}
                          autoFocus
                          placeholder="Type text..."
                          className="absolute bg-transparent outline-none p-1 m-0 border border-dashed border-sky-500/30 font-bold focus:ring-0 focus:outline-none border-transparent focus:border-transparent focus:ring-offset-0 placeholder-slate-400/30 resize-none overflow-hidden"
                          style={{
                            left: `${textInput.x}px`,
                            top: `${textInput.y}px`,
                            width: `${textInput.w}px`,
                            height: `${textInput.h}px`,
                            color: getStrokeColor(color),
                            fontSize: width === 2 ? "16px" : width === 4 ? "24px" : "36px",
                            fontFamily: "sans-serif",
                            lineHeight: "1.2",
                          }}
                        />
                      )}

                      {elements.length === 0 && !isDrawing && !textInput && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 p-8 pointer-events-none space-y-2">
                          <Sparkles className="h-8 w-8 text-sky-400 animate-pulse" />
                          <h5 className="font-extrabold text-sm text-slate-700 dark:text-slate-300">Scholar Roadmap Canvas</h5>
                          <p className="text-[11px] max-w-xs leading-normal">
                            Draw custom diagrams, flows, and milestone maps. Select the **Select**, **Pencil**, **Milestone** (rectangle), **Node** (circle), **Arrow**, **Text**, or **Eraser** tools to start.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Time display */}
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 justify-end">
                <Clock className="h-3 w-3" />
                <span>Last updated: {new Date(activeNote.updatedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 rounded-3xl flex-1 flex flex-col items-center justify-center text-center text-gray-400 space-y-3">
              <FileText className="h-12 w-12 text-slate-400 dark:text-slate-500 animate-bounce" />
              <div>
                <h4 className="font-bold">No Note Selected</h4>
                <p className="text-xs max-w-xs mt-1">Select an existing note from your notebook sidebar or create a new one to begin typing.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {pipWindow && activeNote && createPortal(
        <div className="flex flex-col w-full h-full select-none bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-2xl relative overflow-hidden flex-1 text-slate-800 dark:text-white">
          {/* Note Header / Title */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80 mb-3 shrink-0 gap-3">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <BookOpen className="text-sky-500 dark:text-sky-400 h-4 w-4 shrink-0" />
              <input
                type="text"
                value={activeNote.title}
                onChange={e => handleFieldChange({ title: e.target.value })}
                placeholder="Note Title"
                className="text-xs font-black text-slate-750 dark:text-slate-200 tracking-wider truncate bg-transparent border-none focus:outline-none focus:ring-0 p-0 m-0 w-full"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={toggleTheme}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
              <span className="text-[8px] uppercase font-black bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded select-none">
                {activeNote.category}
              </span>
            </div>
          </div>

          {/* Note Content Textarea - Auto-saving */}
          <textarea
            value={activeNote.content}
            onChange={e => handleFieldChange({ content: e.target.value })}
            placeholder="Type what you learn from YouTube here..."
            className="w-full flex-1 p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500/30 dark:focus:ring-sky-500/50 resize-none font-mono text-xs leading-relaxed transition-colors duration-300"
          />

          <div className="text-[8px] text-slate-400 dark:text-slate-500 mt-2 font-bold text-center">
            Changes auto-save instantly to your notebook 🚀
          </div>
        </div>,
        pipWindow.document.body
      )}
    </div>
  );
};

export default NotesPage;
