
import * as XLSX from "xlsx"

async function main() {
    const filePath = "/Users/quantran/Downloads/data/sanpham_giavon.xlsx"
    console.log(`Reading file: ${filePath}`)
    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

    console.log("First 5 rows:")
    data.slice(0, 5).forEach((row, i) => {
        console.log(`Row ${i}:`, row)
    })
}

main()
