import React, { useState, useEffect, useRef } from "react";
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
  Pencil,
  Sparkles,
  Maximize2,
  Minimize2
} from "lucide-react";

const NotesPage: React.FC = () => {
  const notes = useStore(state => state.notes);
  const addNote = useStore(state => state.addNote);
  const updateNote = useStore(state => state.updateNote);
  const deleteNote = useStore(state => state.deleteNote);

  const [activeNoteId, setActiveNoteId] = useState<string>(notes[0]?.id || "");
  const [editorMode, setEditorMode] = useState<"edit" | "preview" | "roadmap">("edit");
  const darkMode = useStore(state => state.darkMode);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Roadmap canvas drawing states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<"pencil" | "rectangle" | "circle" | "arrow">("pencil");
  const [color, setColor] = useState<string>("#6366f1");
  const [width, setWidth] = useState<number>(3);
  const [elements, setElements] = useState<any[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState<any>(null);

  // Sync canvas elements with active note's drawingData
  useEffect(() => {
    if (activeNote) {
      try {
        const parsed = activeNote.drawingData ? JSON.parse(activeNote.drawingData) : [];
        setElements(parsed);
      } catch (e) {
        setElements([]);
      }
    } else {
      setElements([]);
    }
  }, [activeNoteId]);

  const saveElements = (newElements: any[]) => {
    setElements(newElements);
    if (activeNote) {
      updateNote(activeNote.id, { drawingData: JSON.stringify(newElements) });
    }
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
      ctx.fillStyle = getStrokeColor(el.color) + "10";
      ctx.fill();
      ctx.stroke();
    } else if (el.type === "circle") {
      ctx.beginPath();
      ctx.ellipse(el.x, el.y, Math.abs(el.rx), Math.abs(el.ry), 0, 0, 2 * Math.PI);
      ctx.fillStyle = getStrokeColor(el.color) + "10";
      ctx.fill();
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
  };

  // Redraw when elements or editor mode changes
  useEffect(() => {
    if (editorMode === "roadmap") {
      redrawCanvas();
    }
  }, [elements, isDrawing, currentElement, darkMode, editorMode]);

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

  const handleStart = (x: number, y: number) => {
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
        width
      });
    } else if (tool === "circle") {
      setCurrentElement({
        type: "circle",
        x,
        y,
        rx: 0,
        ry: 0,
        color,
        width
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

  const handleMove = (x: number, y: number) => {
    if (!isDrawing || !currentElement) return;

    if (tool === "pencil") {
      setCurrentElement((prev: any) => ({
        ...prev,
        points: [...prev.points, { x, y }]
      }));
    } else if (tool === "rectangle") {
      setCurrentElement((prev: any) => ({
        ...prev,
        w: x - prev.x,
        h: y - prev.y
      }));
    } else if (tool === "circle") {
      setCurrentElement((prev: any) => ({
        ...prev,
        rx: x - prev.x,
        ry: y - prev.y
      }));
    } else if (tool === "arrow") {
      setCurrentElement((prev: any) => ({
        ...prev,
        x2: x,
        y2: y
      }));
    }
  };

  const handleEnd = () => {
    if (!isDrawing || !currentElement) return;
    setIsDrawing(false);
    saveElements([...elements, currentElement]);
    setCurrentElement(null);
  };

  const handleUndo = () => {
    if (elements.length > 0) {
      const updated = elements.slice(0, -1);
      saveElements(updated);
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
                        : "bg-transparent border-l-slate-200 dark:border-l-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/40"
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
                    className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
                  >
                    <option value="Study">Study</option>
                    <option value="Ideas">Ideas</option>
                    <option value="Coding">Coding</option>
                    <option value="Personal">Personal</option>
                  </select>

                  {/* Mode Toggle Button */}
                  <div className="flex bg-slate-100 dark:bg-slate-850 p-1 rounded-xl">
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
                    className="w-full flex-1 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none font-mono text-sm leading-relaxed text-gray-850 dark:text-gray-200"
                  />
                ) : editorMode === "preview" ? (
                  <div className={`w-full flex-1 p-5 border border-slate-100 dark:border-slate-800/80 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 overflow-y-auto ${
                    isFullscreen ? "max-h-full" : "max-h-[400px]"
                  }`}>
                    <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed text-gray-850 dark:text-gray-200">
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
                          onClick={() => setTool("pencil")}
                          className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            tool === "pencil" ? "bg-sky-500 text-white shadow-md shadow-sky-500/10" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
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
                            tool === "rectangle" ? "bg-sky-500 text-white shadow-md shadow-sky-500/10" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
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
                            tool === "circle" ? "bg-sky-500 text-white shadow-md shadow-sky-500/10" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
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
                            tool === "arrow" ? "bg-sky-500 text-white shadow-md shadow-sky-500/10" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                          title="Draw Flow (Arrow)"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Arrow</span>
                        </button>
                      </div>

                      {/* Middle: Color Palette */}
                      <div className="flex items-center gap-1.5">
                        {["#6366f1", "#0ea5e9", "#10b981", "#f43f5e", "#f59e0b", "currentColor"].map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
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
                              onClick={() => setWidth(w)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-all cursor-pointer ${
                                width === w ? "bg-slate-100 dark:bg-slate-800 text-slate-850 dark:text-slate-200" : "text-slate-400 hover:text-slate-650"
                              }`}
                            >
                              {w === 2 ? "Thin" : w === 4 ? "Mid" : "Thick"}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handleUndo}
                          disabled={elements.length === 0}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-105 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-450 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                          title="Undo"
                        >
                          <Undo2 className="h-4 w-4" />
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
                    <div className={`relative border border-slate-200 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden cursor-crosshair ${
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
                          handleMove(pos.x, pos.y);
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
                      
                      {elements.length === 0 && !isDrawing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 p-8 pointer-events-none space-y-2">
                          <Sparkles className="h-8 w-8 text-sky-400 animate-pulse" />
                          <h5 className="font-extrabold text-sm text-slate-700 dark:text-slate-300">Scholar Roadmap Canvas</h5>
                          <p className="text-[11px] max-w-xs leading-normal">
                            Draw custom diagrams, flows, and milestone maps. Select the **Pencil**, **Milestone** (rectangle), **Node** (circle), or **Arrow** tools to start.
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
              <FileText className="h-12 w-12 text-slate-350 animate-bounce" />
              <div>
                <h4 className="font-bold">No Note Selected</h4>
                <p className="text-xs max-w-xs mt-1">Select an existing note from your notebook sidebar or create a new one to begin typing.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotesPage;
