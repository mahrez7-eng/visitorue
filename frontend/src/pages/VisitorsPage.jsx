import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshVisitors, checkoutVisitor, deleteVisitor } from '../lib/db';
import '../styles/VisitorsPage.css';

const WORK_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function VisitorsPage() {
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDay, setSelectedDay] = useState('all');
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [error, setError] = useState('');

  const parseDateTime = (value) => {
    const text = String(value || '');
    return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(text) ? text : `${text.replace(' ', 'T')}+03:00`);
  };

  const getVisitorCheckInDate = (visitor) => visitor?.checkInDate || visitor?.visitorDate;

  const getWeekdayName = (value) => {
    const date = parseDateTime(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: 'Africa/Dar_es_Salaam'
    });
  };

  // Helper function to format date with time
  const formatDateTime = (dateString) => {
    const date = parseDateTime(dateString);
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    return date.toLocaleString('en-US', { ...options, timeZone: 'Africa/Dar_es_Salaam' });
  };

  const filteredVisitors = (() => {
    let result = visitors;

    // Filter by search term
    if (searchTerm) {
      result = result.filter(v =>
        v.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.phone.includes(searchTerm) ||
        (v.personToVisit || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus === 'active') {
      result = result.filter(v => !v.checkOutDate);
    } else if (filterStatus === 'checked-out') {
      result = result.filter(v => v.checkOutDate);
    } else if (filterStatus === 'Show-Records') {
      if (selectedDay !== 'all') {
        result = result.filter(v => getWeekdayName(getVisitorCheckInDate(v)) === selectedDay);
      }
    }

    return [...result].sort((firstVisitor, secondVisitor) => {
      const firstIsCheckedOut = Boolean(firstVisitor.checkOutDate);
      const secondIsCheckedOut = Boolean(secondVisitor.checkOutDate);

      if (firstIsCheckedOut !== secondIsCheckedOut) {
        return Number(firstIsCheckedOut) - Number(secondIsCheckedOut);
      }

      return parseDateTime(secondVisitor.checkInDate) - parseDateTime(firstVisitor.checkInDate);
    });
  })();

  useEffect(() => {
    refreshVisitors().then(setVisitors);
  }, []);

  const handleCheckOut = async (id) => {
    setError('');
    try {
      const updated = await checkoutVisitor(id);
      setVisitors((prev) => prev.map((v) => (v.id === id ? updated : v)));
      setSelectedVisitor(null);
    } catch (err) {
      setError(err.message || 'Unable to check out this visitor.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this visitor?')) return;
    setError('');
    try {
      await deleteVisitor(id);
      setVisitors((prev) => prev.filter((v) => v.id !== id));
      setSelectedVisitor(null);
    } catch (err) {
      setError(err.message || 'Unable to delete this visitor.');
    }
  };

  return (
    <div className="visitors-container">
      <div className="visitors-header">
        <h1> Visitors List</h1>
        <button
          className="btn-new"
          onClick={() => navigate('/register')}
        >
           New Visitor
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="visitors-controls">
        <input
          type="text"
          className="search-box"
          placeholder="Search by name, phone, or expert..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All ({visitors.length})
          </button>
          <button
            className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
            onClick={() => setFilterStatus('active')}
          >
            Active ({visitors.filter(v => !v.checkOutDate).length})
          </button>
          <button
            className={`filter-btn ${filterStatus === 'checked-out' ? 'active' : ''}`}
            onClick={() => setFilterStatus('checked-out')}
          >
            Checked Out ({visitors.filter(v => v.checkOutDate).length})
          </button>
          <button
            className={`filter-btn ${filterStatus === 'Show-Records' ? 'active' : ''}`}
            onClick={() => setFilterStatus('Show-Records')}
          >
            Filter by Day
          </button>
          <div> 
        {filterStatus === 'Show-Records' && (
          <div className="day-selector-wrap">
        
            <select
              id="day-selector"
              className="day-selector"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
            >
              <option value="all">All Weekdays</option>
              {WORK_WEEK.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>
        )}
        </div>
        </div>

      </div>

      {filteredVisitors.length === 0 ? (
        <div className="no-data-message">
          <p> No visitors found</p>
        </div>
      ) : (
        <div className="visitors-list">
          {filteredVisitors.map(visitor => (
            <div key={visitor.id} className={`visitor-card ${!visitor.checkOutDate ? 'active' : 'checked-out'}`}>
              <div className="visitor-card-header">
                <div className="visitor-name-section">
                  <h3>{visitor.fullName}</h3>
                  <span className={`status-badge ${!visitor.checkOutDate ? 'in' : 'out'}`}>
                    {!visitor.checkOutDate ? '✅ Active' : '⏸️ Checked Out'}
                  </span>
                </div>
                <button
                  className="details-btn"
                  onClick={() => setSelectedVisitor(selectedVisitor?.id === visitor.id ? null : visitor)}
                >
                  {selectedVisitor?.id === visitor.id ? '▼' : '▶'}
                </button>
              </div>

              <div className="visitor-info-brief">
                <span>📞 {visitor.phone}</span>
                <span> {visitor.personToVisit || 'N/A'}</span>
                <span>Day: {getWeekdayName(getVisitorCheckInDate(visitor)) || 'N/A'}</span>
              </div>

              {selectedVisitor?.id === visitor.id && (
                <div className="visitor-details">
                  <div className="detail-row">
                    <span className="label">Phone:</span>
                    <span className="value">{visitor.phone}</span>
                  </div>
                  {visitor.email && (
                    <div className="detail-row">
                      <span className="label">Email:</span>
                      <span className="value">{visitor.email}</span>
                    </div>
                  )}
                  {visitor.company && (
                    <div className="detail-row">
                      <span className="label">Company:</span>
                      <span className="value">{visitor.company}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">Visiting (Expert):</span>
                    <span className="value">{visitor.personToVisit || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Purpose:</span>
                    <span className="value">{visitor.purpose}</span>
                  </div>
                  {visitor.idNumber && (
                    <div className="detail-row">
                      <span className="label">ID:</span>
                      <span className="value">{visitor.idType ? `${visitor.idType} - ` : ''}{visitor.idNumber}</span>
                    </div>
                  )}
                  {visitor.recordedBy && (
                    <div className="detail-row">
                      <span className="label">Recorded by:</span>
                      <span className="value">{visitor.recordedBy}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">Check-in:</span>
                    <span className="value">{formatDateTime(visitor.checkInDate)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Day:</span>
                    <span className="value">{getWeekdayName(getVisitorCheckInDate(visitor)) || 'N/A'}</span>
                  </div>
                  {visitor.checkOutDate && (
                    <div className="detail-row">
                      <span className="label">Check-out:</span>
                      <span className="value">{formatDateTime(visitor.checkOutDate)}</span>
                    </div>
                  )}

                  <div className="visitor-actions">
                    {!visitor.checkOutDate && (
                      <button
                        className="btn-checkout"
                        onClick={() => handleCheckOut(visitor.id)}
                      >
                        ✔️ Mark as Checked Out
                      </button>
                    )}
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(visitor.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
