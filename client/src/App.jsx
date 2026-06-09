import React, { useState, useEffect } from 'react';

// Automatically detect API URL (dynamic fallback)
const API_BASE_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://loan-portal-backend.onrender.com' // Replace with actual live backend URL later if needed
);

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    totalApplications: 0,
    totalAmount: 0,
    statusCounts: { pending: 0, approved: 0, rejected: 0 }
  });
  
  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    amount: '',
    purpose: '',
    language: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [refId, setRefId] = useState('');
  
  // Modal State
  const [selectedApp, setSelectedApp] = useState(null);
  
  // Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Fetch initial summary stats
  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/summary`);
      const data = await res.json();
      if (data.success) {
        setStats(data.summary);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  // Fetch all applications
  const fetchApplications = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter) queryParams.append('status', statusFilter);
      if (searchQuery) queryParams.append('search', searchQuery);
      
      const res = await fetch(`${API_BASE_URL}/api/applications?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setApplications(data.data);
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
      showToast('Error loading applications. Check API connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle live search & filtering
  useEffect(() => {
    if (currentTab === 'dashboard') {
      fetchApplications();
      fetchSummary();
    }
  }, [statusFilter, searchQuery, currentTab]);

  // Utility to show notification toast
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Client-side form validation helper
  const validateForm = () => {
    const errors = {};
    const mobileClean = formData.mobile.replace(/[\s\-\+\(\)]/g, '');
    
    if (!formData.name.trim()) {
      errors.name = 'Applicant name is required.';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }
    
    if (!formData.mobile) {
      errors.mobile = 'Mobile number is required.';
    } else if (!/^\d{10,15}$/.test(mobileClean)) {
      errors.mobile = 'Mobile number must be between 10 and 15 digits.';
    }
    
    if (!formData.amount) {
      errors.amount = 'Loan amount is required.';
    } else if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      errors.amount = 'Loan amount must be a positive number.';
    }
    
    if (!formData.purpose.trim()) {
      errors.purpose = 'Loan purpose is required.';
    } else if (formData.purpose.trim().length < 5) {
      errors.purpose = 'Purpose must describe the reason (min 5 chars).';
    }
    
    if (!formData.language) {
      errors.language = 'Please select a preferred language.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Application handler
  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          mobile: formData.mobile,
          amount: Number(formData.amount),
          purpose: formData.purpose,
          language: formData.language
        })
      });
      
      const data = await res.json();
      if (res.status === 201 && data.success) {
        setRefId(data.application.id);
        setSubmitSuccess(true);
        showToast('Application submitted successfully!');
        // Reset form
        setFormData({ name: '', mobile: '', amount: '', purpose: '', language: '' });
        setFormErrors({});
      } else {
        const errorMsg = data.errors ? data.errors.join(' ') : (data.error || 'Submission failed.');
        showToast(errorMsg, 'error');
      }
    } catch (err) {
      console.error('Error submitting application:', err);
      showToast('API Connection failure. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Update Status handler
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/applications/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await res.json();
      if (res.status === 200 && data.success) {
        // Update dashboard applications state locally without page reload
        setApplications(prev => prev.map(app => app.id === id ? { ...app, status: newStatus } : app));
        
        // Update the active detail modal view
        if (selectedApp && selectedApp.id === id) {
          setSelectedApp(prev => ({ ...prev, status: newStatus }));
        }
        
        showToast(`Application status updated to ${newStatus}`);
        fetchSummary(); // Refresh dashboard counts
      } else {
        showToast(data.error || 'Failed to update status.', 'error');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      showToast('Network error updating status.', 'error');
    }
  };

  // Indian Rupee Formatter
  const formatRupee = (num) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Date Formatter
  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Copy reference ID
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Reference ID copied to clipboard!');
  };

  return (
    <div>
      <header>
        <div className="logo-container">
          <div className="logo-icon">V</div>
          <div>
            <div className="logo-text">Vitto Portal</div>
            <div className="logo-subtitle">Operations Desk</div>
          </div>
        </div>
        <div className="nav-buttons">
          <button 
            className={`nav-btn ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setCurrentTab('dashboard'); setSubmitSuccess(false); }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"></path>
            </svg>
            Dashboard
          </button>
          <button 
            className={`nav-btn ${currentTab === 'apply' ? 'active' : ''}`}
            onClick={() => { setCurrentTab('apply'); }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Submit Application
          </button>
        </div>
      </header>

      <main className="app-container">
        {currentTab === 'dashboard' && (
          <>
            {/* Stats Dashboard */}
            <div className="stats-bar">
              <div className="stat-card total">
                <div className="stat-icon" style={{color: '#60a5fa'}} >
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Total Applications</span>
                  <span className="stat-value">{stats.totalApplications}</span>
                </div>
              </div>

              <div className="stat-card total">
                <div className="stat-icon" style={{color: '#818cf8'}}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.4rem' }}>₹</span>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Total Amount</span>
                  <span className="stat-value">{formatRupee(stats.totalAmount)}</span>
                </div>
              </div>

              <div className="stat-card pending">
                <div className="stat-icon" style={{color: '#fbbf24'}}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Pending</span>
                  <span className="stat-value">{stats.statusCounts.pending}</span>
                </div>
              </div>

              <div className="stat-card approved">
                <div className="stat-icon" style={{color: '#34d399'}}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Approved</span>
                  <span className="stat-value">{stats.statusCounts.approved}</span>
                </div>
              </div>

              <div className="stat-card rejected">
                <div className="stat-icon" style={{color: '#f87171'}}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Rejected</span>
                  <span className="stat-value">{stats.statusCounts.rejected}</span>
                </div>
              </div>
            </div>

            {/* Controls Filters & Search */}
            <div className="controls-bar">
              <div className="search-container">
                <span className="search-icon">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </span>
                <input 
                  type="text" 
                  className="search-input"
                  placeholder="Search by applicant name or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filter-container">
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Status Filter:</span>
                <select 
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Applications</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Table of Applications */}
            <div className="table-container">
              {loading && applications.length === 0 ? (
                <div className="loader-container">
                  <span className="loader"></span>
                </div>
              ) : applications.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📁</div>
                  <h3>No applications found</h3>
                  <p style={{ marginTop: '0.5rem' }}>Try modifying your filters or search terms.</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Applicant</th>
                      <th>Mobile</th>
                      <th>Amount</th>
                      <th>Purpose</th>
                      <th>Language</th>
                      <th>Status</th>
                      <th>Date Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id} onClick={() => setSelectedApp(app)}>
                        <td data-label="Applicant" style={{ fontWeight: 600 }}>{app.name}</td>
                        <td data-label="Mobile">{app.mobile}</td>
                        <td data-label="Amount" style={{ color: '#fff', fontWeight: 500 }}>{formatRupee(app.amount)}</td>
                        <td data-label="Purpose" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.purpose}</td>
                        <td data-label="Language">
                          <span className={`lang-badge ${app.language.toLowerCase()}`}>
                            {app.language}
                          </span>
                        </td>
                        <td data-label="Status">
                          <span className={`badge ${app.status.toLowerCase()}`}>
                            {app.status}
                          </span>
                        </td>
                        <td data-label="Date Submitted" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {formatDate(app.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {currentTab === 'apply' && (
          <div className="form-card">
            {!submitSuccess ? (
              <>
                <div className="form-header">
                  <h2 className="form-title">Loan Application Form</h2>
                  <p className="form-desc">Complete the details below to submit a borrower application. All fields are required.</p>
                </div>

                <form onSubmit={handleApplySubmit} noValidate>
                  <div className="form-group">
                    <label className="form-label">
                      <span>Applicant Full Name <span className="required">*</span></span>
                    </label>
                    <input 
                      type="text" 
                      className={`form-input ${formErrors.name ? 'error' : ''}`}
                      placeholder="e.g. Ramesh Kumar"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span>Mobile Number <span className="required">*</span></span>
                    </label>
                    <input 
                      type="tel" 
                      className={`form-input ${formErrors.mobile ? 'error' : ''}`}
                      placeholder="e.g. 9876543210"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    />
                    {formErrors.mobile && <span className="error-text">{formErrors.mobile}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span>Loan Amount (₹) <span className="required">*</span></span>
                    </label>
                    <input 
                      type="number" 
                      className={`form-input ${formErrors.amount ? 'error' : ''}`}
                      placeholder="e.g. 50000"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                    {formErrors.amount && <span className="error-text">{formErrors.amount}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span>Loan Purpose <span className="required">*</span></span>
                    </label>
                    <textarea 
                      rows="3"
                      className={`form-input ${formErrors.purpose ? 'error' : ''}`}
                      placeholder="e.g. Purchase of seeds and fertilizers for Rabi season"
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    />
                    {formErrors.purpose && <span className="error-text">{formErrors.purpose}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span>Preferred Language <span className="required">*</span></span>
                    </label>
                    <select 
                      className={`form-select ${formErrors.language ? 'error' : ''}`}
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    >
                      <option value="">-- Choose Language --</option>
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Tamil">Tamil</option>
                      <option value="Telugu">Telugu</option>
                      <option value="Marathi">Marathi</option>
                    </select>
                    {formErrors.language && <span className="error-text">{formErrors.language}</span>}
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-submit" disabled={submitting}>
                      {submitting ? 'Submitting Application...' : 'Submit Loan Application'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="success-card">
                <div className="success-icon">✓</div>
                <h2 className="form-title" style={{ color: 'var(--success)' }}>Submission Successful!</h2>
                <p className="form-desc" style={{ marginTop: '0.5rem' }}>
                  The application has been saved to the database. Below is the borrower's unique application reference number:
                </p>

                <div className="ref-box">
                  <span className="ref-number">{refId}</span>
                  <button className="btn-copy" onClick={() => copyToClipboard(refId)}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                    </svg>
                    Copy
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
                  <button 
                    className="btn-submit"
                    onClick={() => { setSubmitSuccess(false); setCurrentTab('dashboard'); }}
                  >
                    Go to Dashboard
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => { setSubmitSuccess(false); }}
                  >
                    Submit Another Application
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Detail & Status Update Modal */}
      {selectedApp && (
        <div className="modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedApp(null)}>×</button>
            <h3 className="modal-title">Application Status Panel</h3>
            
            <div className="detail-row">
              <span className="detail-label">Application ID</span>
              <span className="detail-val" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{selectedApp.id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Applicant Name</span>
              <span className="detail-val" style={{ fontWeight: 600 }}>{selectedApp.name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Mobile Number</span>
              <span className="detail-val">{selectedApp.mobile}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Loan Amount</span>
              <span className="detail-val" style={{ color: '#10b981', fontWeight: 600 }}>{formatRupee(selectedApp.amount)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Preferred Language</span>
              <span className="detail-val">
                <span className={`lang-badge ${selectedApp.language.toLowerCase()}`}>
                  {selectedApp.language}
                </span>
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Submitted On</span>
              <span className="detail-val">{formatDate(selectedApp.created_at)}</span>
            </div>
            <div className="detail-row" style={{ flexDirection: 'column', gap: '0.25rem', borderBottom: 'none' }}>
              <span className="detail-label">Loan Purpose</span>
              <p style={{ 
                background: 'rgba(255,255,255,0.02)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                padding: '0.75rem', 
                fontSize: '0.9rem', 
                color: 'var(--text-secondary)',
                lineHeight: '1.4',
                marginTop: '0.25rem',
                textAlign: 'left'
              }}>
                {selectedApp.purpose}
              </p>
            </div>
            <div className="detail-row" style={{ borderBottom: 'none', marginTop: '0.5rem' }}>
              <span className="detail-label">Current Status</span>
              <span className={`badge ${selectedApp.status.toLowerCase()}`}>
                {selectedApp.status}
              </span>
            </div>

            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', textAlign: 'center' }}>
                Change status of this application:
              </p>
              <div className="modal-actions">
                <button 
                  className="btn-approve"
                  onClick={() => handleStatusUpdate(selectedApp.id, 'approved')}
                  disabled={selectedApp.status === 'approved'}
                  style={{ opacity: selectedApp.status === 'approved' ? 0.5 : 1 }}
                >
                  Approve Application
                </button>
                <button 
                  className="btn-reject"
                  onClick={() => handleStatusUpdate(selectedApp.id, 'rejected')}
                  disabled={selectedApp.status === 'rejected'}
                  style={{ opacity: selectedApp.status === 'rejected' ? 0.5 : 1 }}
                >
                  Reject Application
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Notifications */}
      {toast.show && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <span style={{ fontSize: '1.2rem' }}>
              {toast.type === 'success' ? '✓' : '⚠'}
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
