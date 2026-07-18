package com.studymania.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundTimer")
public class BackgroundTimerPlugin extends Plugin {
    private static final String CHANNEL_ID = "background_timer_channel";
    private static final int NOTIFICATION_ID = 99128;

    @PluginMethod
    public void showTimerNotification(PluginCall call) {
        String title = call.getString("title", "Focus Session Active");
        String body = call.getString("body", "Study Mania is running in the background");
        Integer secondsLeft = call.getInt("secondsLeft", 0);
        Boolean isCountDown = call.getBoolean("isCountDown", true);

        Context context = getContext();
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        // Create Channel for Android O and above
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Background Timer Notification", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Shows active timer and stopwatch countdowns in the background");
            notificationManager.createNotificationChannel(channel);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_media_play) // Standard play icon
                .setContentTitle(title)
                .setContentText(body)
                .setOngoing(true) // Cannot be swiped away
                .setAutoCancel(false)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setShowWhen(true);

        if (secondsLeft > 0) {
            builder.setUsesChronometer(true);
            if (isCountDown) {
                // Countdown: Target end timestamp is current time + secondsLeft
                long targetTime = System.currentTimeMillis() + (secondsLeft * 1000);
                builder.setWhen(targetTime);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    builder.setChronometerCountDown(true);
                }
            } else {
                // Count up: Base is current time - elapsed seconds
                long startTime = System.currentTimeMillis() - (secondsLeft * 1000);
                builder.setWhen(startTime);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    builder.setChronometerCountDown(false);
                }
            }
        }

        Notification notification = builder.build();
        notificationManager.notify(NOTIFICATION_ID, notification);

        call.resolve();
    }

    @PluginMethod
    public void dismissTimerNotification(PluginCall call) {
        Context context = getContext();
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.cancel(NOTIFICATION_ID);
        call.resolve();
    }
}
