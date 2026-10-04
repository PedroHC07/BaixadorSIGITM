(function (root) {
  "use strict";

  function parseDate(value) {
    if (value instanceof Date && Number.isFinite(value.getTime())) return new Date(value.getTime());
    const text = String(value ?? "").trim();
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/) ||
      text.match(/^(\d{4})-(\d{2})-(\d{2})$/) ||
      text.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;
    const br = text.includes("/");
    let year = Number(br ? match[3] : match[1]);
    if (br && year < 100) year += 2000;
    const month = Number(match[2]);
    const day = Number(br ? match[1] : match[3]);
    const hour = Number(match[4] || 0);
    const minute = Number(match[5] || 0);
    const second = Number(match[6] || 0);
    const date = new Date(year, month - 1, day, hour, minute, second);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day &&
      date.getHours() === hour && date.getMinutes() === minute && date.getSeconds() === second ? date : null;
  }

  function addHours(date, hours) {
    const result = new Date(date.getTime() + hours * 60 * 60 * 1000);
    const pad = value => String(value).padStart(2, "0");
    return `${pad(result.getDate())}/${pad(result.getMonth() + 1)}/${result.getFullYear()} ${pad(result.getHours())}:${pad(result.getMinutes())}`;
  }

  function repairFromCreation(data) {
    const creation = parseDate(data.dataCriacao);
    return creation ? addHours(creation, 2) : "";
  }

  function validateDates(data) {
    const creation = parseDate(data.dataCriacao);
    const objective = parseDate(data.dataObjetivo);
    const repairValue = repairFromCreation(data);
    const repair = parseDate(repairValue);
    const clockPaused = root.BaixaHelpers.normalizeText(data.paradaRelogio) === "sim";
    const pause = parseDate(data.dataParadaRelogio);
    if (!creation) return { valid: false, reason: "Data Criação não identificada ou inválida; não é possível calcular Data de Reparo + 2 horas." };
    if (!objective) return { valid: false, reason: "Data Objetivo não identificada ou inválida." };
    if (!repair) return { valid: false, reason: "Não foi possível calcular Data de Reparo + 2 horas." };
    if (repair.getTime() >= objective.getTime()) return { valid: false, reason: "Data de Reparo deve ser anterior à Data Objetivo." };
    const slaEnd = new Date(creation.getTime() + 4 * 60 * 60 * 1000);
    if (repair.getTime() > slaEnd.getTime()) return { valid: false, reason: "Data de Reparo excede o SLA de 4 horas." };
    if (clockPaused && !pause) return { valid: false, reason: "Pausa de Relógio está ativa, mas a data/hora da pausa não foi identificada." };
    if (pause && repair.getTime() >= pause.getTime()) return { valid: false, reason: "Data de Reparo deve ser anterior à parada de relógio." };
    return { valid: true, repair, repairValue, objective, pause, slaEnd };
  }

  const api = { parseDate, addHours, repairFromCreation, validateDates };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.BaixaDateHandler = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
