import StatusBadge from "./StatusBadge";

export default function DataTable({ columns, rows, compact = true }) {
  return (
    <div className="table-wrap">
      <table className={`w-full min-w-full bg-white ${compact ? "text-xs md:text-sm" : "text-sm"}`}>
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={`${column.align === "left" ? "text-left" : "text-center"} font-bold px-2 md:px-3 py-2 whitespace-nowrap`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={row.id || row.name || index} className="hover:bg-slate-50">
              {columns.map((column) => {
                const value = row[column.key];
                return (
                  <td key={column.key} className={`px-2 md:px-3 py-2 align-middle ${column.align === "left" ? "text-left" : "text-center"} ${column.wrap ? "whitespace-normal min-w-32" : "whitespace-nowrap"}`}>
                    {column.badge ? <StatusBadge status={value} /> : column.render ? column.render(row) : value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
