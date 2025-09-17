package ts.enhancer.xtr;

public class MainKt {
  public static void main(String[] args) {
    Thread modifyThread = new Thread(new ModifyExcute());
    modifyThread.start();
    Thread conflictThread = new Thread(new ConflictCheck());
    conflictThread.start();
    Logger.logout("服务启动成功");
  }
}
