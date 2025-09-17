package ts.enhancer.xtr;

import java.io.File;
import java.nio.file.*;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static java.nio.file.StandardWatchEventKinds.*;

public class ModifyExcute implements Runnable {

  private static final File MONITOR_FILE = new File("/data/app/");
  private static final Path MONITOR_PATH = MONITOR_FILE.toPath();
  private static final long LOG_SUPPRESS_MS = 1500L;
  private static final Map<String, Long> LAST_LOG_TIMES = new ConcurrentHashMap<>();

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
          logOnce("触发执行包名列表更新&冲突软件排除");

          try {
            ProcessBuilder pb = new ProcessBuilder("/data/adb/modules/ts_enhancer_extreme/libraries/tseed", "--conflictappcheck", "--packagelistupdate");
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