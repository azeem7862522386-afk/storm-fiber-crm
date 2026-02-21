const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function convertHundreds(num: number): string {
  let result = "";
  if (num >= 100) {
    result += ones[Math.floor(num / 100)] + " Hundred";
    num %= 100;
    if (num > 0) result += " ";
  }
  if (num >= 20) {
    result += tens[Math.floor(num / 10)];
    num %= 10;
    if (num > 0) result += " " + ones[num];
  } else if (num > 0) {
    result += ones[num];
  }
  return result;
}

function convertTwoDigits(num: number): string {
  if (num >= 20) {
    let result = tens[Math.floor(num / 10)];
    const remainder = num % 10;
    if (remainder > 0) result += " " + ones[remainder];
    return result;
  }
  return ones[num] || "";
}

export function amountToWords(amount: number): string {
  if (amount === 0) return "Zero Rupees Only";

  let num = Math.abs(Math.floor(amount));
  const parts: string[] = [];

  const hundreds = num % 1000;
  num = Math.floor(num / 1000);

  if (num > 0) {
    const thousand = num % 100;
    num = Math.floor(num / 100);

    if (num > 0) {
      const lakh = num % 100;
      num = Math.floor(num / 100);

      if (num > 0) {
        parts.push(convertTwoDigits(num) + " Crore");
      }

      if (lakh > 0) {
        parts.push(convertTwoDigits(lakh) + " Lakh");
      }
    }

    if (thousand > 0) {
      parts.push(convertTwoDigits(thousand) + " Thousand");
    }
  }

  if (hundreds > 0) {
    parts.push(convertHundreds(hundreds));
  }

  return (parts.join(" ") + " Rupees Only").toUpperCase();
}
