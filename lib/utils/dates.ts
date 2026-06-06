export function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function formatDate(format: string, date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();

  return format.replace(/YYYY|YY|MM|M|DD|D|HH|H|mm|m|ss|s|SSS/g, (token) => {
    switch (token) {
      case "YYYY":
        return String(year);
      case "YY":
        return String(year).slice(-2);
      case "MM":
        return String(month).padStart(2, "0");
      case "M":
        return String(month);
      case "DD":
        return String(day).padStart(2, "0");
      case "D":
        return String(day);
      case "HH":
        return String(hours).padStart(2, "0");
      case "H":
        return String(hours);
      case "mm":
        return String(minutes).padStart(2, "0");
      case "m":
        return String(minutes);
      case "ss":
        return String(seconds).padStart(2, "0");
      case "s":
        return String(seconds);
      case "SSS":
        return String(milliseconds).padStart(3, "0");
      default:
        return token;
    }
  });
}
