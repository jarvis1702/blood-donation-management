import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/notificationService';

const NotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const reloadNotifications = () => {
    setNotifications(notificationService.getNotifications());
  };

  useEffect(() => {
    reloadNotifications();
    const unsubscribe = notificationService.subscribe(reloadNotifications);
    return () => unsubscribe();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notif) => {
    notificationService.markAsRead(notif.id);
    reloadNotifications();
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    notificationService.markAllAsRead();
    reloadNotifications();
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    notificationService.clearAll();
    reloadNotifications();
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        className="btn-icon-bell" 
        onClick={() => setIsOpen(!isOpen)}
        title="Emergency Notifications (SCRUM-19)"
        aria-label="Notifications"
      >
        <span className="bell-emoji">🔔</span>
        {unreadCount > 0 && (
          <span className="bell-badge-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown-panel">
          <div className="notification-header">
            <div className="notification-title-group">
              <h4>Alerts & Notifications</h4>
              {unreadCount > 0 && <span className="notif-count-pill">{unreadCount} new</span>}
            </div>
            <div className="notification-actions">
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="btn-link-action">
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={handleClearAll} className="btn-link-action" style={{ color: 'var(--color-danger)' }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <span>🔕</span>
                <p>No new campus alerts</p>
                <small>You're all caught up with emergency notifications.</small>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`notification-item ${!notif.read ? 'unread' : ''} type-${notif.type}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="notif-indicator-dot"></div>
                  <div className="notif-content">
                    <div className="notif-top">
                      <span className="notif-title">{notif.title}</span>
                      <span className="notif-time">{formatTime(notif.timestamp)}</span>
                    </div>
                    <p className="notif-message">{notif.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
