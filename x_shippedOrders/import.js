import { createPool } from "mysql"; // library (package) npmjs.org
import XLSX from "xlsx"; // library (package) npmjs.org

const filename = "shipped_raw.xls";
const expectedSheetName = "Sheet1"; // The name of the sheet in the excel file
const headerRow = 2; // The row number of the header row in the excel file

const workbook = XLSX.readFile(filename, {
    cellDates: true,
    sheets: expectedSheetName,
});
const Sheet1 = workbook.Sheets[expectedSheetName];
const dimensions = Sheet1["!ref"].match(/([A-Z]+)([0-9]+):([A-Z]+)([0-9]+)/); // backend excel functionality (weird)

function alphaToNum(alpha) {
    var i = 0,
        num = 0,
        len = alpha.length;

    for (; i < len; i++) {
        num = num * 26 + alpha.charCodeAt(i) - 0x40;
    }

    return num - 1;
}
function numToAlpha(num) {
    var alpha = "";

    for (; num >= 0; num = parseInt(num / 26, 10) - 1) {
        alpha = String.fromCharCode((num % 26) + 0x41) + alpha;
    }

    return alpha;
}
function _buildColumnsArray(range) {
    var i,
        res = [],
        rangeNum = range.split(":").map(function (val) {
            return alphaToNum(val.replace(/[0-9]/g, ""));
        }),
        start = rangeNum[0],
        end = rangeNum[1] + 1;

    for (i = start; i < end; i++) {
        res.push(numToAlpha(i));
    }

    return res;
}

const columnsArray = _buildColumnsArray(Sheet1["!ref"]);

let headers = [];
columnsArray.forEach((column) => {
    const cell = Sheet1[`${column}${headerRow}`];
    if (cell) {
        headers.push(cell.v);
    }
});

let records = [];
for (let i = 0; i < dimensions[4]; i++) {
    const rowNum = i + 1;
    if (rowNum <= headerRow) {
        continue;
    }

    const cells = {};

    columnsArray.forEach((column) => {
        const cell = Sheet1[`${column}${rowNum}`];
        if (cell && cell.v && !String(cell.v).startsWith("Page ")) {
            const dbCol = headers[alphaToNum(column)].replace(
                /[^0-9a-zA-Z$_]/g,
                ""
            );
            cells[dbCol] = cell.v;
        }
    });

    if (Object.keys(cells).length) {
        records.push(cells);
    }
}

const pool = createPool({
    connectionLimit: 10,
    host: "45.79.203.190", // .xyz
    //host: "172.105.148.239", // .com
    //host: "45.79.1.249", // .work
    user: "steele",
    password: "r4ZIDm/Cn]YOwnxS",
    database: "jonathans_database",
});

pool.getConnection((err, connection) => {
    if (err) throw err; // not connected!
    let i = 0;
    for (const record of records) {
        let sql = "INSERT INTO ---- SET ?";
        let values = record;
        try {
            // Use the connection
            //console.log(values);
            connection.query(sql, values, (error, results, fields) => {
                i++;
                if (i >= records.length) {
                    console.log("All records inserted, closing connection");
                    // When done with the connection, release it.
                    connection.release();
                }
                // Handle error after the release.
                if (error) throw error;

                //console.log(results);
                console.log(
                    "Number of records inserted: " +
                        results.affectedRows +
                        ", Record: " +
                        i +
                        "/" +
                        records.length
                );
            });
        } catch (e) {
            console.error(e);
        }
    }

    pool.end((err) => {
        if (err) throw err; // problem ending connections!
        // all connections in the pool have ended
    });
});
