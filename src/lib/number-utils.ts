/**
 * Chuyển đổi số tiền thành chữ (tiếng Việt)
 * Ví dụ: 1,500,000 → "Một triệu năm trăm nghìn đồng chẵn"
 */

const DONVI = [
     "",
     "một",
     "hai",
     "ba",
     "bốn",
     "năm",
     "sáu",
     "bảy",
     "tám",
     "chín",
];
const CHUC = [
     "",
     "mười",
     "hai mươi",
     "ba mươi",
     "bốn mươi",
     "năm mươi",
     "sáu mươi",
     "bảy mươi",
     "tám mươi",
     "chín mươi",
];
const TRAM = ["", "trăm"];

const DON_VI_TIEN = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

function docBaChuSo(num: number): string {
     if (num === 0) return "";

     const tram = Math.floor(num / 100);
     const chuc = Math.floor((num % 100) / 10);
     const donvi = num % 10;

     let result = "";

     // Hàng trăm
     if (tram > 0) {
          result += DONVI[tram] + " trăm";
     } else if (chuc > 0 || donvi > 0) {
          result += "không trăm";
     }

     // Hàng chục
     if (chuc > 1) {
          result += " " + CHUC[chuc];
          if (donvi === 1) {
               result += " mốt";
          } else if (donvi === 5) {
               result += " lăm";
          } else if (donvi > 0) {
               result += " " + DONVI[donvi];
          }
     } else if (chuc === 1) {
          result += " mười";
          if (donvi === 1) {
               result += " một";
          } else if (donvi === 5) {
               result += " lăm";
          } else if (donvi > 0) {
               result += " " + DONVI[donvi];
          }
     } else if (donvi > 0) {
          if (tram > 0) {
               result += " lẻ";
          }
          if (donvi === 5 && (chuc > 0 || tram > 0)) {
               result += " lăm";
          } else {
               result += " " + DONVI[donvi];
          }
     }

     return result.trim();
}

/**
 * Chuyển số tiền (VND) thành chữ tiếng Việt
 */
export function amountToWords(amount: number | string): string {
     const num =
          typeof amount === "string"
               ? parseFloat(amount.replace(/[^0-9.-]/g, ""))
               : amount;

     if (isNaN(num) || num < 0) return "";
     if (num === 0) return "Không đồng chẵn";

     const isNegative = num < 0;
     const absNum = Math.abs(Math.round(num));

     if (absNum === 0) return "Không đồng chẵn";

     let result = "";
     let groupIndex = 0;
     let remaining = absNum;

     while (remaining > 0) {
          const threeDigits = remaining % 1000;
          remaining = Math.floor(remaining / 1000);

          if (threeDigits > 0) {
               const doc = docBaChuSo(threeDigits);
               const donviTien = DON_VI_TIEN[groupIndex];
               result = doc + (donviTien ? " " + donviTien : "") + " " + result;
          }

          groupIndex++;
     }

     result = result.trim();
     result = result.charAt(0).toUpperCase() + result.slice(1);

     if (isNegative) result = "Âm " + result;

     return result + " đồng chẵn";
}

/**
 * Format số tiền VND với dấu phân cách
 */
export function formatVND(amount: number | string | null | undefined): string {
     if (amount === null || amount === undefined || amount === "") return "0";
     const num = typeof amount === "string" ? parseFloat(amount) : amount;
     if (isNaN(num)) return "0";
     return num.toLocaleString("vi-VN");
}

/**
 * Format số tiền VND với đơn vị
 */
export function formatCurrency(
     amount: number | string | null | undefined,
): string {
     return formatVND(amount) + " VNĐ";
}

/**
 * Chuyển chuỗi ngày sang định dạng Việt Nam
 */
export function formatDate(date: Date | string | null | undefined): string {
     if (!date) return "";
     const d = typeof date === "string" ? new Date(date) : date;
     return d.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
     });
}
