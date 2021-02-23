export class Logger {
  info(text: string, location: string = "default") {
    console.log("[" + location + "]" + this.getTime() + " " + text);
  }

  getTime(): string {
    const date = new Date();
    return (
      "[" +
      [date.getHours(), date.getMinutes(), date.getSeconds()].join(":") +
      "]"
    );
  }
}
