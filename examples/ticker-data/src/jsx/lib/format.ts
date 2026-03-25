// src/jsx/lib/format.ts
// ES3-compatible number formatters for use in text binding

export function formatPrice(num: number): string {
  if (!num && num !== 0) return "—";
  var formatted = num.toFixed(2);
  var parts = formatted.split(".");
  var intPart = parts[0];
  var decPart = parts[1];
  var result = "";
  var count = 0;
  for (var i = intPart.length - 1; i >= 0; i--) {
    if (count > 0 && count % 3 === 0) result = "," + result;
    result = intPart[i] + result;
    count++;
  }
  return "$" + result + "." + decPart;
}

export function formatPercent(num: number): string {
  if (!num && num !== 0) return "—";
  var sign = num >= 0 ? "+" : "";
  return sign + num.toFixed(2) + "%";
}

export function formatChange(num: number): string {
  if (!num && num !== 0) return "—";
  var sign = num >= 0 ? "+" : "";
  return sign + num.toFixed(2);
}

export function formatVolume(num: number): string {
  if (!num) return "—";
  if (num >= 1e12) return (num / 1e12).toFixed(1) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(1) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
  return String(num);
}

export function formatMarketCap(num: number): string {
  if (!num) return "—";
  if (num >= 1e12) return "$" + (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return "$" + (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return "$" + (num / 1e6).toFixed(2) + "M";
  return "$" + num.toFixed(0);
}

export function formatDate(isoString: string): string {
  var d = new Date(isoString);
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var hours = d.getHours();
  var minutes = d.getMinutes();
  var ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  var minStr = minutes < 10 ? "0" + minutes : String(minutes);
  return months[d.getMonth()] + " " + d.getDate() + " " + hours + ":" + minStr + " " + ampm;
}
