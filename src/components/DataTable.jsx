import StatusBadge from "./StatusBadge";

export default function DataTable({ columns, rows }) {
  return (
    <div className="table-wrap">
      <table className="w-full min-w-full bg-white text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="text-center font-bold px-4 py-3 whitespace-nowrap">
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
                  <td key={column.key} className="px-4 py-3 whitespace-nowrap text-center align-middle">
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
