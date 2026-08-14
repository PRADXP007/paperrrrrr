const path = require("path");
const ExcelJS = require("exceljs");

async function buildExcelSheet(outputFilename = "Paperrrrrr_Generated_Spreadsheet.xlsx") {
  console.log(`\n==================================================`);
  console.log(`📈 GENERATING EDITABLE EXCEL SPREADSHEET (.xlsx)`);
  console.log(`==================================================\n`);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Paperrrrrr Document Studio";

  const sheet = workbook.addWorksheet("Renewable Energy Data", {
    views: [{ showGridLines: true }]
  });

  // Title Block
  sheet.mergeCells("A1:E1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "India Renewable Energy Capacity & Projection Data (2024-2030)";
  titleCell.font = { name: "Georgia", size: 16, bold: true, color: { argb: "97422C" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };

  sheet.addRow([]);

  // Table Headers
  const headers = ["Sector / Source", "2024 Installed (GW)", "2026 Target (GW)", "2030 Target (GW)", "Growth Rate (%)"];
  const headerRow = sheet.addRow(headers);

  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "97422C" }
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // Data Rows
  const data = [
    ["Solar Power", 70.1, 120.0, 300.0, "=ROUND((D4-B4)/B4*100, 1)"],
    ["Wind Power", 44.3, 60.0, 100.0, "=ROUND((D5-B5)/B5*100, 1)"],
    ["Green Hydrogen Dedicated Capacity", 0.0, 25.0, 125.0, "N/A"],
    ["Small Hydro & Other Biomass", 10.8, 15.0, 25.0, "=ROUND((D7-B7)/B7*100, 1)"]
  ];

  data.forEach((row) => {
    const addedRow = sheet.addRow(row);
    addedRow.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10 };
      if (colNumber >= 2 && colNumber <= 4) {
        cell.numFmt = "#,##0.0";
        cell.alignment = { horizontal: "right" };
      }
    });
  });

  // Total Summary Row
  sheet.addRow([]);
  const totalRow = sheet.addRow([
    "Total Non-Fossil Capacity",
    "=SUM(B4:B7)",
    "=SUM(C4:C7)",
    "=SUM(D4:D7)",
    "=ROUND((D9-B9)/B9*100, 1)"
  ]);

  totalRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "1B1C1A" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "E2DFDE" }
    };
  });

  // Set column widths
  sheet.columns = [
    { width: 35 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 20 }
  ];

  const outputPath = path.join(__dirname, outputFilename);
  await workbook.xlsx.writeFile(outputPath);

  console.log(`✅ Excel spreadsheet successfully generated!`);
  console.log(`File saved to: ${outputPath}`);
}

buildExcelSheet();
