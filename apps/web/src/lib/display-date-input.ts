export const DISPLAY_DATE_PLACEHOLDER = "dd/mm/yyyy";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DISPLAY_DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;

export function formatDateToDisplay(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) {
    return value;
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function formatDisplayDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getDaysInMonth(month: number, year: number) {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }

  return 31;
}

export function isValidDisplayDate(value: string) {
  if (!DISPLAY_DATE_PATTERN.test(value)) {
    return false;
  }

  const [dayString, monthString, yearString] = value.split("/");
  const day = Number(dayString);
  const month = Number(monthString);
  const year = Number(yearString);

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return false;
  }

  if (month < 1 || month > 12 || day < 1 || year < 1000 || year > 9999) {
    return false;
  }

  return day <= getDaysInMonth(month, year);
}

export function parseDisplayDateToIso(value: string) {
  if (!isValidDisplayDate(value)) {
    return null;
  }

  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
}
