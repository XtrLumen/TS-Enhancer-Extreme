package ts.enhancer.xtr;

import java.io.File;
import java.nio.file.*;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static java.nio.file.StandardWatchEventKinds.*;

public class ConflictCheck implements Runnable {

  private static final String LOG_MODE;
  private static final File MONITOR_FILE;
  private static final Path MONITOR_PATH;
  private static final boolean IMG_EXISTS;
  private static final long LOG_SUPPRESS_MS = 1500L;
  private static final Map<String, Long> LAST_LOG_TIMES = new ConcurrentHashMap<>();

  static {
    File apImg = new File("/data/adb/ap/modules.img");
    File ksuImg = new File("/data/adb/ksu/modules.img");
    if (apImg.exists() || ksuImg.exists()) {
      MONITOR_FILE = new File("/data/adb/modules");
      LOG_MODE = "触发执行冲突模块检查-OverlayFS";
      IMG_EXISTS = true;
    } else {
      MONITOR_FILE = new File("/data/adb/modules_update");
      LOG_MODE = "触发执行冲突模块检查-MagicMount";
      IMG_EXISTS = false;
    }
    MONITOR_PATH = MONITOR_FILE.toPath();
  }

  @Override
  public void run() {
    WatchService watcher = null;
    try {
      watcher = FileSystems.getDefault().newWatchService();
      MONITOR_PATH.register(watcher, ENTRY_CREATE, ENTRY_MODIFY, ENTRY_DELETE);

      while (true) {
        WatchKey key = watcher.take();
        boolean changed = false;

        for (WatchEvent<?> event : key.pollEvents()) {
          changed = true;
        }

        if (changed) {
          logOnce(LOG_MODE);

            try {
              String arg = IMG_EXISTS ? "-o" : "-m";
              ProcessBuilder pb = new ProcessBuilder("/data/adb/modules/ts_enhancer_extreme/libraries/tseed", "--conflictmodcheck", arg);
              Process p = pb.start();
              p.waitFor();
            } catch (Exception ignored) {}
        }

        if (!key.reset()) {
          break;
        }
      }
    } catch (Exception ignored) {
    } finally {
      if (watcher != null) {
        try {
          watcher.close();
        } catch (Exception ignored) {}
      }
    }
  }

  private static void logOnce(String msg) {
    long now = System.currentTimeMillis();
    Long last = LAST_LOG_TIMES.get(msg);
    if (last == null || now - last >= LOG_SUPPRESS_MS) {
      Logger.logout(msg);
      LAST_LOG_TIMES.put(msg, now);
    }
  }
}