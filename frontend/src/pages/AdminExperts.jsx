import { useEffect, useRef, useState } from 'react';
import { refreshExperts, createExpert, updateExpert, deleteExpert, refreshVisitors } from '../lib/db';
import '../styles/DashboardPage.css';

const emptyForm = { id: null, fullname: '', department: '' };
const EXPERT_COLUMNS = ['Full Name', 'Department'];

async function downloadWorkbook(rows, filename) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Experts');
  worksheet.addRow(EXPERT_COLUMNS);
  rows.forEach((row) => worksheet.addRow(EXPERT_COLUMNS.map((column) => row[column] || '')));

  const buffer = await workbook.xlsx.writeBuffer();
  const downloadUrl = URL.createObjectURL(new Blob([buffer]));
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

export default function AdminExperts() {
  const [experts, setExperts] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const editing = !!form.id;

  useEffect(() => {
    Promise.all([refreshExperts(), refreshVisitors()]).then(([loadedExperts, loadedVisitors]) => {
      setExperts(loadedExperts);
      setVisitors(loadedVisitors);
    });
  }, []);

  function resetForm() {
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.fullname.trim()) {
      setError('Full name is required.');
      return;
    }

    try {
      if (editing) {
        const updated = await updateExpert(form.id, {
          fullname: form.fullname.trim(),
          department: form.department.trim(),
        });
        setExperts((prev) => prev.map((x) => (x.id === form.id ? updated : x)));
        setSuccess('Expert updated successfully.');
      } else {
        const created = await createExpert({
          fullname: form.fullname.trim(),
          department: form.department.trim(),
        });
        setExperts((prev) => [...prev, created]);
        setSuccess('Expert added successfully.');
      }
      resetForm();
    } catch (err) {
      setError(err.message || 'Something went wrong while saving the expert.');
    }
  }

  function handleEdit(exp) {
    setForm({ id: exp.id, fullname: exp.fullname, department: exp.department || '' });
    setError('');
    setSuccess('');
  }

  async function handleDelete(exp) {
    setError('');
    setSuccess('');

    const hasVisitors = visitors.some((v) => v.expertId === exp.id);
    if (hasVisitors) {
      setError(`Unable to delete: ${exp.fullname} has visitor records in the system.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete ${exp.fullname}?`)) return;

    try {
      await deleteExpert(exp.id);
      setExperts((prev) => prev.filter((x) => x.id !== exp.id));
      setSuccess('Expert deleted successfully.');
    } catch (err) {
      setError(err.message || 'Unable to delete expert.');
    }
  }

  function exportExperts() {
    downloadWorkbook(experts.map((expert) => ({
      'Full Name': expert.fullname,
      Department: expert.department || '',
    })), 'experts.xlsx');
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    setSuccess('');
    setImporting(true);

    try {
      if (!file.name.toLowerCase().endsWith('.xlsx')) {
        throw new Error('Please choose an Excel Workbook (.xlsx) file.');
      }

      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error('The selected file does not contain a worksheet.');

      const headers = worksheet.getRow(1).values.slice(1).map((value) => String(value || '').trim().toLowerCase());
      const fullnameColumn = headers.findIndex((header) => ['full name', 'fullname', 'name'].includes(header)) + 1;
      const departmentColumn = headers.indexOf('department') + 1;
      if (!fullnameColumn) throw new Error('The selected sheet must have a "Full Name" column.');

      const imported = [];
      const rowErrors = [];

      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
        const row = worksheet.getRow(rowNumber);
        const fullname = String(row.getCell(fullnameColumn).text || '').trim();
        const department = departmentColumn ? String(row.getCell(departmentColumn).text || '').trim() : '';

        if (!fullname && !department) continue;
        if (!fullname) {
          rowErrors.push(rowNumber);
          continue;
        }

        try {
          imported.push(await createExpert({ fullname, department }));
        } catch {
          rowErrors.push(rowNumber);
        }
      }

      if (imported.length > 0) setExperts((previous) => [...previous, ...imported]);

      if (rowErrors.length > 0) {
        setError(`Imported ${imported.length} expert(s). Could not import spreadsheet row(s): ${rowErrors.join(', ')}.`);
      } else if (imported.length > 0) {
        setSuccess(`Imported ${imported.length} expert(s) successfully.`);
      } else {
        setError('No experts were imported. Check that the sheet has a "Full Name" column and names are filled in.');
      }
    } catch (err) {
      setError(err.message || 'Unable to read the selected spreadsheet.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <div className="welcome-section">
          <h1> Manage Experts</h1>
          <p>Add, edit, or remove the experts which visitors can meet</p>
        </div>

        <div className="admin-section-panel">
          <div className="panel-header-row">
            <h2>{editing ? 'Edit Expert' : 'Add New Expert'}</h2>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-banner">{success}</div>}

          <form onSubmit={handleSubmit} className="receptionist-form">
            <div className="form-group">
              <label>Full Name </label>
              <input
                type="text"
                value={form.fullname}
                onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))}
                placeholder=" Enter full name of the expert"
              />
            </div>
            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                placeholder=" Enter department of the expert"
              />
            </div>
            <div className="dashboard-actions">
              <button type="submit" className="action-btn primary">
                {editing ? ' Update Expert' : ' Add Expert'}
              </button>
              {editing && (
                <button type="button" className="action-btn secondary" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="admin-section-panel admin-inline-section">
          <div className="panel-header-row">
            <h2>All Experts</h2>
            <span>{experts.length} Total</span>
          </div>

          <div className="dashboard-actions expert-import-actions">
            <button type="button" className="action-btn secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing ? 'Importing...' : 'Import Excel'}
            </button>
            <button type="button" className="action-btn secondary" onClick={exportExperts} disabled={experts.length === 0}>
              Export Excel
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleImport}
              hidden
            />
          </div>

          {experts.length === 0 ? (
            <div className="empty-state">No experts added yet.</div>
          ) : (
            <div className="admin-section-table-wrap">
              <table className="admin-section-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Full Name</th>
                    <th>Department</th>
                    <th>Visitors Seen</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {experts.map((exp, i) => (
                    <tr key={exp.id}>
                      <td>{i + 1}</td>
                      <td>{exp.fullname}</td>
                      <td>{exp.department || '-'}</td>
                      <td>{visitors.filter((v) => v.expertId === exp.id).length}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="mini-action-button" onClick={() => handleEdit(exp)}>
                             Edit
                          </button>
                          <button className="mini-action-button danger" onClick={() => handleDelete(exp)}>
                             Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
