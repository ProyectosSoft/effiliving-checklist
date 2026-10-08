import ExcelJS from "exceljs"
import { jsPDF } from "jspdf"
import { autoTable } from "jspdf-autotable"
import { formatDate, formatDateTime, label, RESULT_STATUSES, REVIEW_STATUSES, REVIEW_TYPES } from "@/lib/constants"
import { groupResults, summarize, type fetchResults, type ReviewDetail, type ReviewRow } from "@/lib/reviews"

type ResultRow = Awaited<ReturnType<typeof fetchResults>>[number]

const BRAND: [number, number, number] = [36, 116, 102]
const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

// Descarga un archivo generado en el navegador.
export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1)
  header.font = { bold: true, color: { argb: "FFFFFFFF" } }
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF247466" } }
  sheet.views = [{ state: "frozen", ySplit: 1 }]
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } }
}

function sortResults(results: ResultRow[]) {
  return [...results].sort(
    (a, b) =>
      (a.item?.category?.sort_order ?? 9999) - (b.item?.category?.sort_order ?? 9999) ||
      (a.item?.label ?? "").localeCompare(b.item?.label ?? ""),
  )
}

// ---- Listado de revisiones -------------------------------------------------

export async function reviewsToXlsx(rows: ReviewRow[], results: ResultRow[]) {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Effiliving Checklist"

  const byReview = new Map<string, ResultRow[]>()
  for (const r of results) if (r.review_id) byReview.set(r.review_id, [...(byReview.get(r.review_id) ?? []), r])

  const summary = wb.addWorksheet("Revisiones")
  summary.columns = [
    { header: "Fecha", key: "date", width: 12 },
    { header: "Hotel", key: "property", width: 28 },
    { header: "Piso", key: "floor", width: 8 },
    { header: "Habitación", key: "room", width: 12 },
    { header: "Tipo", key: "type", width: 18 },
    { header: "Inspector", key: "inspector", width: 26 },
    { header: "Estado", key: "status", width: 14 },
    { header: "OK", key: "ok", width: 8 },
    { header: "Pendiente", key: "pend", width: 10 },
    { header: "No aplica", key: "na", width: 10 },
    { header: "% OK", key: "pct", width: 8 },
  ]
  for (const r of rows) {
    const s = summarize((byReview.get(r.id) ?? []).map((x) => x.status))
    summary.addRow({
      date: formatDate(r.review_date),
      property: r.room.property.name,
      floor: r.room.floor ?? "",
      room: r.room.number,
      type: label(REVIEW_TYPES, r.review_type),
      inspector: r.reviewer?.full_name ?? "",
      status: label(REVIEW_STATUSES, r.status),
      ok: s.ok,
      pend: s.pendiente,
      na: s.noAplica,
      pct: s.pctOk ?? "",
    })
  }
  styleHeader(summary)

  const detail = wb.addWorksheet("Detalle por ítem")
  detail.columns = [
    { header: "Fecha", key: "date", width: 12 },
    { header: "Hotel", key: "property", width: 28 },
    { header: "Habitación", key: "room", width: 12 },
    { header: "Inspector", key: "inspector", width: 26 },
    { header: "Categoría", key: "category", width: 28 },
    { header: "Ítem", key: "item", width: 34 },
    { header: "Estado", key: "status", width: 12 },
    { header: "Observaciones", key: "notes", width: 50 },
  ]
  for (const r of rows) {
    for (const x of sortResults(byReview.get(r.id) ?? [])) {
      detail.addRow({
        date: formatDate(r.review_date),
        property: r.room.property.name,
        room: r.room.number,
        inspector: r.reviewer?.full_name ?? "",
        category: x.item?.category?.name ?? "",
        item: x.item?.label ?? "",
        status: label(RESULT_STATUSES, x.status),
        notes: x.notes ?? "",
      })
    }
  }
  styleHeader(detail)

  return new Blob([await wb.xlsx.writeBuffer()], { type: XLSX_TYPE })
}

export function reviewsToPdf(rows: ReviewRow[], results: ResultRow[], filtersText: string) {
  const doc = new jsPDF({ orientation: "landscape" })
  doc.setFontSize(14)
  doc.text("Effiliving Checklist - Revisiones", 14, 15)
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(`Generado: ${formatDateTime(new Date().toISOString())}${filtersText ? ` | ${filtersText}` : ""}`, 14, 21)

  const byReview = new Map<string, (string | null)[]>()
  for (const r of results) if (r.review_id) byReview.set(r.review_id, [...(byReview.get(r.review_id) ?? []), r.status])

  autoTable(doc, {
    startY: 26,
    head: [["Fecha", "Hotel", "Piso", "Habitación", "Tipo", "Inspector", "Estado", "OK", "Pend.", "N/A", "% OK"]],
    body: rows.map((r) => {
      const s = summarize(byReview.get(r.id) ?? [])
      return [
        formatDate(r.review_date),
        r.room.property.name,
        r.room.floor ?? "",
        r.room.number,
        label(REVIEW_TYPES, r.review_type),
        r.reviewer?.full_name ?? "",
        label(REVIEW_STATUSES, r.status),
        s.ok,
        s.pendiente,
        s.noAplica,
        s.pctOk === null ? "" : `${s.pctOk}%`,
      ]
    }),
    styles: { fontSize: 8 },
    headStyles: { fillColor: BRAND },
  })
  return doc.output("blob")
}

// ---- Revisión individual ---------------------------------------------------

function reviewHeader(review: ReviewDetail): [string, string][] {
  return [
    ["Hotel", review.room?.property?.name ?? ""],
    ["Piso", review.room?.floor ?? ""],
    ["Habitación", `${review.room?.number ?? ""}${review.room?.room_type ? ` (${review.room.room_type})` : ""}`],
    ["Tipo de revisión", label(REVIEW_TYPES, review.review_type)],
    ["Fecha", formatDate(review.review_date)],
    ["Revisado por", review.reviewer?.full_name ?? ""],
    ["Estado", label(REVIEW_STATUSES, review.status)],
  ]
}

export async function reviewToXlsx(review: ReviewDetail) {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Effiliving Checklist"
  const sheet = wb.addWorksheet("Revisión")
  sheet.columns = [{ width: 30 }, { width: 38 }, { width: 14 }, { width: 50 }]

  sheet.addRow(["Effiliving Checklist - Revisión"]).font = { bold: true, size: 14 }
  for (const [k, v] of reviewHeader(review)) sheet.addRow([k, v]).getCell(1).font = { bold: true }
  const t = summarize(review.results.map((r) => r.status))
  sheet.addRow(["Resumen", `OK: ${t.ok} | Pendiente: ${t.pendiente} | No aplica: ${t.noAplica}`]).getCell(1).font = {
    bold: true,
  }
  sheet.addRow([])

  const head = sheet.addRow(["Categoría", "Ítem", "Estado", "Observaciones"])
  head.font = { bold: true, color: { argb: "FFFFFFFF" } }
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF247466" } }
  for (const group of groupResults(review.results)) {
    for (const r of group.rows) {
      sheet.addRow([group.name, r.item?.label ?? "", label(RESULT_STATUSES, r.status), r.notes ?? ""])
    }
  }

  if (review.signoffs.length) {
    sheet.addRow([])
    sheet.addRow(["Firmas / VoBo"]).font = { bold: true }
    for (const s of review.signoffs) {
      sheet.addRow([s.role_label ?? "", s.signer_name ?? "", s.signed_at ? "VoBo" : "Sin VoBo", formatDateTime(s.signed_at)])
    }
  }
  return new Blob([await wb.xlsx.writeBuffer()], { type: XLSX_TYPE })
}

export function reviewToPdf(review: ReviewDetail) {
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text("Effiliving Checklist - Revisión", 14, 15)

  autoTable(doc, {
    startY: 20,
    body: reviewHeader(review),
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 40 } },
  })

  const t = summarize(review.results.map((r) => r.status))
  autoTable(doc, {
    body: [[`OK: ${t.ok}`, `Pendiente: ${t.pendiente}`, `No aplica: ${t.noAplica}`, t.pctOk === null ? "" : `${t.pctOk}% OK`]],
    theme: "grid",
    styles: { fontSize: 9, halign: "center" },
  })

  for (const group of groupResults(review.results)) {
    autoTable(doc, {
      head: [[group.name, "Estado", "Observaciones"]],
      body: group.rows.map((r) => [r.item?.label ?? "", label(RESULT_STATUSES, r.status), r.notes ?? ""]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: BRAND },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 22 } },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 1 && data.cell.raw === "Pendiente") {
          data.cell.styles.textColor = [180, 83, 9]
          data.cell.styles.fontStyle = "bold"
        }
      },
    })
  }

  if (review.signoffs.length) {
    autoTable(doc, {
      head: [["Firma / VoBo", "Nombre", "Fecha VoBo"]],
      body: review.signoffs.map((s) => [s.role_label ?? "", s.signer_name ?? "", s.signed_at ? formatDateTime(s.signed_at) : "Sin VoBo"]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: BRAND },
    })
  }

  return doc.output("blob")
}
