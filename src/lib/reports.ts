import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { Expense } from "../types";

// Excel Export function
export function exportToExcel(expenses: Expense[], currencySymbol: string) {
  const data = expenses.map((e) => ({
    Date: e.date,
    Category: e.category,
    Description: e.description,
    Amount: `${currencySymbol}${e.amount.toFixed(2)}`,
    "Payment Mode": e.paymentMode,
    Notes: e.notes || ""
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
  XLSX.writeFile(workbook, `TMK_Expenses_${new Date().toISOString().split("T")[0]}.xlsx`);
}

// PDF Export function with beautiful tabular layout, summary stats, and headers
export function exportToPDF(
  expenses: Expense[], 
  userName: string, 
  userEmail: string, 
  currencySymbol: string,
  monthlyBudget: number
) {
  const doc = new jsPDF();
  
  // Header details
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129); // Emerald Green
  doc.text("TMK EXPENSE TRACKER & ANALYTICS", 14, 20);

  doc.setFontSize(10);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(100, 116, 139); // Slate Grey
  doc.text(`Generated For: ${userName} (${userEmail})`, 14, 28);
  doc.text(`Generated On: ${new Date().toLocaleString()}`, 14, 34);
  doc.text(`Monthly Budget: ${currencySymbol}${monthlyBudget.toLocaleString()}`, 14, 40);

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 45, 196, 45);

  // Financial Summary Metrics
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const avgSpent = expenses.length > 0 ? totalSpent / expenses.length : 0;
  const maxExpense = expenses.length > 0 ? Math.max(...expenses.map(e => e.amount)) : 0;
  const minExpense = expenses.length > 0 ? Math.min(...expenses.map(e => e.amount)) : 0;

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("Financial Metrics Summary", 14, 53);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Total Transaction Volume: ${expenses.length}`, 14, 61);
  doc.text(`Total Amount Spent: ${currencySymbol}${totalSpent.toFixed(2)}`, 14, 67);
  doc.text(`Average Expense Cost: ${currencySymbol}${avgSpent.toFixed(2)}`, 14, 73);
  
  doc.text(`Highest Logged Expense: ${currencySymbol}${maxExpense.toFixed(2)}`, 110, 61);
  doc.text(`Lowest Logged Expense: ${currencySymbol}${minExpense.toFixed(2)}`, 110, 67);
  doc.text(`Budget Remaining: ${currencySymbol}${(monthlyBudget - totalSpent).toFixed(2)}`, 110, 73);

  // Divider
  doc.line(14, 79, 196, 79);

  // Category summary calculations
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Category Breakdown Summary", 14, 87);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  let categoryY = 95;
  Object.entries(categoryTotals).forEach(([cat, amt]) => {
    if (categoryY < 130) {
      const percentage = totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(1) : "0";
      doc.text(`• ${cat}: ${currencySymbol}${amt.toFixed(2)} (${percentage}%)`, 16, categoryY);
      categoryY += 6;
    }
  });

  // Divider
  doc.line(14, 135, 196, 135);

  // Expense Details Table
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Expense Transactions List", 14, 143);

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 149, 182, 8, "F");
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text("Date", 16, 154);
  doc.text("Category", 42, 154);
  doc.text("Description", 80, 154);
  doc.text("Amount", 145, 154);
  doc.text("Payment Mode", 170, 154);

  // Table rows
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  let rowY = 162;
  const sortedExpenses = [...expenses].sort((a, b) => b.date.localeCompare(a.date));

  sortedExpenses.slice(0, 18).forEach((e) => {
    if (rowY < 280) {
      doc.text(e.date, 16, rowY);
      
      // Handle potential long string values
      const categoryText = e.category.length > 15 ? e.category.substring(0, 12) + "..." : e.category;
      doc.text(categoryText, 42, rowY);

      const descriptionText = e.description.length > 28 ? e.description.substring(0, 25) + "..." : e.description;
      doc.text(descriptionText, 80, rowY);

      doc.text(`${currencySymbol}${e.amount.toFixed(2)}`, 145, rowY);
      doc.text(e.paymentMode, 170, rowY);
      
      // Row separator line
      doc.setDrawColor(241, 245, 249);
      doc.line(14, rowY + 2, 196, rowY + 2);
      rowY += 7;
    }
  });

  if (expenses.length > 18) {
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(8);
    doc.text(`* Showing first 18 of ${expenses.length} total transactions. Download Excel for full records.`, 14, 287);
  }

  doc.save(`TMK_Expense_Report_${new Date().toISOString().split("T")[0]}.pdf`);
}

// CSV Export function
export function exportToCSV(expenses: Expense[], currencySymbol: string) {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Date,Category,Description,Amount,Payment Mode,Notes\n";

  expenses.forEach((e) => {
    const row = [
      e.date,
      `"${e.category.replace(/"/g, '""')}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      `${e.amount.toFixed(2)}`,
      e.paymentMode,
      `"${(e.notes || "").replace(/"/g, '""')}"`
    ].join(",");
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `TMK_Expenses_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Excel/CSV Parsing Function for bulk imports
export function parseImportFile(file: File): Promise<Partial<Expense>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

        // Map sheets back to our expected fields
        const importedExpenses: Partial<Expense>[] = rows.map((row) => {
          // Normalize column lookups to be case insensitive and flexible
          const findVal = (keys: string[]) => {
            const foundKey = Object.keys(row).find(k => 
              keys.some(key => k.toLowerCase().replace(/[^a-z]/g, "") === key.toLowerCase().replace(/[^a-z]/g, ""))
            );
            return foundKey ? row[foundKey] : undefined;
          };

          const rawAmount = findVal(["amount", "spent", "cost", "value"]);
          const amount = rawAmount ? parseFloat(rawAmount.toString().replace(/[^0-9.]/g, "")) : 0;
          
          let dateStr = findVal(["date", "day", "when"]);
          if (dateStr && !isNaN(Date.parse(dateStr))) {
            dateStr = new Date(dateStr).toISOString().split("T")[0];
          } else {
            dateStr = new Date().toISOString().split("T")[0];
          }

          return {
            date: dateStr,
            category: findVal(["category", "type", "tag"])?.toString() || "Miscellaneous",
            description: findVal(["description", "item", "title", "details"])?.toString() || "Imported Expense",
            amount: isNaN(amount) ? 0 : amount,
            paymentMode: findVal(["paymentmode", "payment", "mode"])?.toString() || "Cash",
            notes: findVal(["notes", "comment", "remarks"])?.toString() || ""
          };
        });

        resolve(importedExpenses.filter(e => e.amount && e.amount > 0));
      } catch (err) {
        reject(new Error("Invalid format or failed to read Excel/CSV workbook. Please ensure correct headers (Date, Category, Description, Amount, Payment Mode, Notes)."));
      }
    };
    reader.onerror = () => reject(new Error("File reading error."));
    reader.readAsArrayBuffer(file);
  });
}
