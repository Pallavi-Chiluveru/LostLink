import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, CheckCircle2, MessageSquare, Package, Sparkles, AlertCircle, Lock, MapPin, Map, X, MoreVertical, Flag, Ban } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const CAMPUS_LOCATIONS = ['Main Gate', 'Library Entrance', 'Canteen', 'Security Desk', 'Parking Area', 'Block Entrance', 'Other Location'];
const EMPTY_MEETING_POINT = { name: '', meetingDate: '', meetingTime: '', latitude: undefined, longitude: undefined };
function entityId(value) {
  return String(value?._id || value?.id || value || '');
}

function sameId(left, right) {
  const leftId = entityId(left);
  return Boolean(leftId) && leftId === entityId(right);
}

const REPORT_REASONS = [
  ['FALSE_CLAIM', 'False claim'], ['FAKE_FOUND_RESPONSE', 'Fake found response'], ['SPAM', 'Spam'],
  ['HARASSMENT', 'Harassment'], ['SUSPICIOUS_BEHAVIOUR', 'Suspicious behaviour'], ['OTHER', 'Other']
];

function formatMeetingSchedule(meetingPoint) {
  const parts = [];
  if (meetingPoint?.meetingDate) {
    const date = new Date(`${meetingPoint.meetingDate}T00:00:00`);
    const today = new Date();
    parts.push(date.toDateString() === today.toDateString()
      ? 'Today'
      : date.toLocaleDateString([], { month: 'short', day: 'numeric', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' }));
  }
  if (meetingPoint?.meetingTime) {
    const [hours, minutes] = meetingPoint.meetingTime.split(':').map(Number);
    parts.push(new Date(2000, 0, 1, hours, minutes).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
  }
  return parts.join(' • ');
}

function MeetingPointCard({ message, isMe, currentUser, otherUser }) {
  const point = message.meetingPoint;
  const schedule = formatMeetingSchedule(point);
  const hasCoordinates = Number.isFinite(point.latitude) && Number.isFinite(point.longitude);
  const mapsUrl = hasCoordinates
    ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(point.latitude + ',' + point.longitude)
    : '';

  return (
    <div className="min-w-0 sm:min-w-[240px]">
      <div className={isMe ? 'flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-100' : 'flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-700'}>
        <MapPin className="w-3.5 h-3.5" /> Meeting Point
      </div>
      <p className="text-sm font-extrabold mt-1 break-words">{point.name}</p>
      {schedule && <p className={isMe ? 'mt-1 text-[11px] text-blue-100' : 'mt-1 text-[11px] text-gray-500'}>{schedule}</p>}
      <p className={isMe ? 'mt-1 text-[10px] text-blue-100' : 'mt-1 text-[10px] text-gray-500'}>
        Suggested by {isMe ? (currentUser?.name?.split(' ')[0] || 'You') : otherUser?.name}
      </p>
      {hasCoordinates && (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={isMe ? 'mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold bg-white/15 text-white hover:bg-white/25' : 'mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100'}>
          <Map className="w-3.5 h-3.5" /> Open in Maps
        </a>
      )}
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeConvData, setActiveConvData] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliverySuccess, setDeliverySuccess] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [meetingPoint, setMeetingPoint] = useState(EMPTY_MEETING_POINT);
  const [locationError, setLocationError] = useState('');
  const [locating, setLocating] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [showChatActions, setShowChatActions] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const sendingRef = useRef(false);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/conversations');
      const list = res.data || [];
      setConversations(list);
      if (list.length > 0 && !activeConvId) {
        setActiveConvId(list[0]._id);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId) => {
    if (!convId) return;
    try {
      const res = await api.get(`/conversations/${convId}/messages`);
      setMessages(res.data.messages || []);
      setActiveConvData(res.data);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
      const interval = setInterval(() => {
        if (!document.hidden && !sendingRef.current) fetchMessages(activeConvId);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [activeConvId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeConvId || sending) return;

    const currentText = text.trim();
    const optimisticId = `sending-${Date.now()}`;
    setText('');
    setSending(true);
    sendingRef.current = true;
    setMessages((current) => [...current, {
      _id: optimisticId,
      senderId: user?._id,
      messageType: 'TEXT',
      text: currentText,
      createdAt: new Date().toISOString(),
      sending: true
    }]);

    try {
      const res = await api.post(`/conversations/${activeConvId}/messages`, { text: currentText });
      setMessages((current) => current.map((message) => message._id === optimisticId ? res.data : message));
    } catch (err) {
      setMessages((current) => current.filter((message) => message._id !== optimisticId));
      setText(currentText);
      showToast('Could not send message.', 'error');
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  };

  // Mark Delivered action for finder
  const handleMarkDelivered = async () => {
    if (!activeConvData?.foundItem?._id) return;
    try {
      await api.post(`/found-items/${activeConvData.foundItem._id}/delivered`);
      setShowDeliveryModal(false);
      setDeliverySuccess(true);
      showToast('Item status updated to DELIVERED!', 'success');
      fetchMessages(activeConvId);
    } catch (err) {
      showToast(err.response?.data?.message || 'Error marking item delivered.', 'error');
    }
  };

  const closeLocationModal = () => {
    setShowLocationModal(false);
    setSelectedLocation('');
    setMeetingPoint(EMPTY_MEETING_POINT);
    setLocationError('');
  };

  const chooseCampusLocation = (name) => {
    setSelectedLocation(name);
    setMeetingPoint((current) => ({
      ...current,
      name: name === 'Other Location' ? '' : name,
      latitude: undefined,
      longitude: undefined
    }));
    setLocationError('');
  };

  const useCurrentLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Geolocation is unavailable. You can still choose a campus meeting point.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setSelectedLocation('Current Location');
        setMeetingPoint((current) => ({
          ...current,
          name: 'Shared Location',
          latitude: coords.latitude,
          longitude: coords.longitude
        }));
        setLocating(false);
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. You can still choose a campus meeting point.'
          : error.code === error.TIMEOUT
            ? 'Location request timed out. You can still choose a campus meeting point.'
            : 'Your location could not be determined. You can still choose a campus meeting point.';
        setLocationError(message);
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
    );
  };

  const shareMeetingPoint = async (event) => {
    event.preventDefault();
    if (!activeConvId || !meetingPoint.name.trim()) {
      setLocationError('Please choose or enter a meeting point.');
      return;
    }

    setSharingLocation(true);
    setLocationError('');
    try {
      const res = await api.post(`/conversations/${activeConvId}/messages`, {
        messageType: 'MEETING_POINT',
        meetingPoint
      });
      setMessages((current) => [...current, res.data]);
      closeLocationModal();
    } catch (err) {
      setLocationError(err.response?.data?.message || 'Could not share the meeting point. Please try again.');
    } finally {
      setSharingLocation(false);
    }
  };

  const confirmHandover = async (received) => {
    try {
      await api.post('/found-items/' + activeConvData.foundItem._id + '/handover-confirmation', { received });
      showToast(received ? 'Item reunited successfully!' : 'The item remains pending.', received ? 'success' : 'info');
      if (received) setDeliverySuccess(true);
      fetchMessages(activeConvId);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not update the handover.', 'error');
    }
  };

  const toggleBlock = async () => {
    const otherUserId = activeConvData?.otherUser?._id;
    if (!otherUserId) return;
    try {
      if (activeConvData.blockStatus?.blockedByMe) await api.delete('/moderation/blocks/' + otherUserId);
      else await api.post('/moderation/blocks/' + otherUserId);
      setShowBlockModal(false);
      setShowChatActions(false);
      fetchMessages(activeConvId);
      showToast(activeConvData.blockStatus?.blockedByMe ? 'User unblocked.' : 'User blocked.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not update block status.', 'error');
    }
  };

  const submitReport = async (event) => {
    event.preventDefault();
    try {
      await api.post('/moderation/reports', {
        reportedUserId: activeConvData.otherUser._id,
        targetType: 'USER',
        targetId: activeConvData.otherUser._id,
        reason: reportReason,
        details: reportDetails
      });
      setShowReportModal(false);
      setReportReason('');
      setReportDetails('');
      showToast('Report submitted safely.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not submit the report.', 'error');
    }
  };
  const handleMarkRecovered = async () => {
    if (!activeConvData?.missingRequest?._id) return;
    try { await api.post(`/missing/${activeConvData.missingRequest._id}/recovered`); setDeliverySuccess(true); showToast('Item recovered successfully!', 'success'); fetchMessages(activeConvId); }
    catch (err) { showToast(err.response?.data?.message || 'Could not mark recovered.', 'error'); }
  };

  const isFinder = Boolean(activeConvData?.foundItem && sameId(activeConvData.foundItem.postedBy, user));
  const isDelivered = activeConvData?.foundItem?.status === 'DELIVERED';
  const isHandoverPending = activeConvData?.foundItem?.status === 'HANDOVER_PENDING';
  const isMissingOwner = Boolean(activeConvData?.missingRequest && sameId(activeConvData.missingRequest.userId, user));
  const isRecovered = activeConvData?.missingRequest?.status === 'RECOVERED';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[600px] h-[calc(100vh-180px)]">
          {/* Left Column: Conversations List */}
          <div className="min-h-0 overflow-hidden border-r border-gray-200 flex flex-col bg-gray-50/50">
            <div className="shrink-0 p-4 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Verified Messages</h2>
              <p className="text-xs text-gray-500">Private 1-on-1 chats with verified owners/finders.</p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-100">
              {loading ? (
                <div className="p-6 text-center text-xs text-gray-400">Loading chats...</div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                  <Lock className="w-8 h-8 mx-auto text-gray-300" />
                  <p className="font-bold text-gray-600">No verified conversations yet.</p>
                  <p>Chat unlocks only after ownership verification.</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv._id}
                    onClick={() => setActiveConvId(conv._id)}
                    className={`w-full text-left p-4 hover:bg-gray-100 transition-colors flex items-start gap-3 ${
                      activeConvId === conv._id ? 'bg-blue-50/80 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <img
                      src={conv.item?.imageUrl || 'https://placehold.co/100x100?text=Item'}
                      alt={conv.item?.itemName}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-gray-900 truncate">
                          {conv.item?.itemName}
                        </h4>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">
                        {conv.otherUser?.name} ({conv.otherUser?.dept})
                      </p>
                      <p className="text-[11px] text-gray-400 truncate mt-1">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Chat View */}
          <div className="md:col-span-2 min-h-0 overflow-hidden flex flex-col bg-white">
            {activeConvData ? (
              <>
                {/* Chat Header */}
                <div className="shrink-0 p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between gap-3 bg-white shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold" aria-hidden="true">
                      {activeConvData.otherUser?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{activeConvData.otherUser?.name || 'Student'}</h3>
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Verified Return Chat - {activeConvData.item?.itemName}
                      </p>
                    </div>
                  </div>

                  {/* Finder Mark Delivered Button */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isRecovered ? <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">RECOVERED</span> : isMissingOwner ? <button onClick={handleMarkRecovered} className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">I Got My Item Back</button> : isDelivered ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> DELIVERED
                      </span>
                    ) : isHandoverPending && isFinder ? (
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">Awaiting Confirmation</span>
                    ) : isFinder ? (
                      <button
                        onClick={() => setShowDeliveryModal(true)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Mark Item as Delivered
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Messages Body */}
                <div ref={messagesContainerRef} className="flex-1 min-h-0 p-4 overflow-y-auto overscroll-contain space-y-3 bg-gray-50/50">
                  <div className="text-center py-2">
                    <span className="px-3 py-1 bg-gray-200/80 text-gray-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      🔒 End-to-End Verified LostLink Chat
                    </span>
                  </div>

                  {messages.map((msg) => {
                    const isMe = sameId(msg.senderId, user);
                    return (
                      <div
                        key={msg._id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs sm:max-w-md px-4 py-2.5 rounded-2xl text-xs shadow-xs font-medium ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-br-none'
                              : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                          }`}
                        >
                          {msg.messageType === 'MEETING_POINT' && msg.meetingPoint
                            ? <MeetingPointCard message={msg} isMe={isMe} currentUser={user} otherUser={activeConvData.otherUser} />
                            : <p className="leading-relaxed break-words">{msg.text}</p>}
                          <span
                            className={`block text-[9px] mt-1 text-right font-normal ${
                              isMe ? 'text-blue-100' : 'text-gray-400'
                            }`}
                          >
                            {msg.sending ? 'Sending…' : new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Form */}
                <form onSubmit={handleSendMessage} className="shrink-0 p-4 border-t border-gray-200 bg-white flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLocationModal(true)}
                    title="Share meeting point"
                    aria-label="Share meeting point"
                    className="shrink-0 p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message to schedule safe return..."
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={sending || !text.trim()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8 text-gray-400 text-xs">
                Select a verified conversation to start chatting.
              </div>
            )}
          </div>
        </div>
      </main>

      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm fade-in" role="dialog" aria-modal="true" aria-labelledby="meeting-point-title">
          <form onSubmit={shareMeetingPoint} className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 border border-gray-200 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="meeting-point-title" className="text-lg font-extrabold text-gray-900">Choose Meeting Point</h3>
                <p className="text-xs text-gray-500 mt-1">Choose a safe place to return the item.</p>
              </div>
              <button type="button" onClick={closeLocationModal} aria-label="Close meeting point dialog" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-5">
              {CAMPUS_LOCATIONS.map((location) => (
                <button
                  key={location}
                  type="button"
                  onClick={() => chooseCampusLocation(location)}
                  className={selectedLocation === location ? 'px-3 py-2.5 rounded-xl border border-blue-600 bg-blue-50 text-blue-700 text-xs font-bold' : 'px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50/50 text-xs font-semibold'}
                >
                  {location}
                </button>
              ))}
            </div>

            <button type="button" onClick={useCurrentLocation} disabled={locating} className="mt-3 w-full px-3 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60">
              <MapPin className="w-4 h-4" /> {locating ? 'Getting Your Location...' : 'Use My Current Location'}
            </button>

            {selectedLocation === 'Other Location' && (
              <label className="block mt-4 text-xs font-bold text-gray-700">
                Location Name
                <input type="text" maxLength={120} value={meetingPoint.name} onChange={(event) => setMeetingPoint((current) => ({ ...current, name: event.target.value }))} placeholder="C Block Ground Floor" className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-gray-50 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </label>
            )}

            {selectedLocation && selectedLocation !== 'Other Location' && (
              <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-100 text-xs font-bold text-blue-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0" /> {meetingPoint.name}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <label className="text-xs font-bold text-gray-700">
                Meeting Date <span className="font-normal text-gray-400">(optional)</span>
                <input type="date" value={meetingPoint.meetingDate} onChange={(event) => setMeetingPoint((current) => ({ ...current, meetingDate: event.target.value }))} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-gray-50 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </label>
              <label className="text-xs font-bold text-gray-700">
                Meeting Time <span className="font-normal text-gray-400">(optional)</span>
                <input type="time" value={meetingPoint.meetingTime} onChange={(event) => setMeetingPoint((current) => ({ ...current, meetingTime: event.target.value }))} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-gray-50 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </label>
            </div>

            {locationError && <p className="mt-3 text-xs font-semibold text-red-600 flex items-start gap-1.5"><AlertCircle className="w-4 h-4 shrink-0" /> {locationError}</p>}

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button type="button" onClick={closeLocationModal} className="py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={sharingLocation || locating || !meetingPoint.name.trim()} className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white shadow-md disabled:opacity-50">
                {sharingLocation ? 'Sharing...' : 'Share Meeting Point'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Modal for Delivery */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 border border-gray-200 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-extrabold text-gray-900">Mark Item as Delivered?</h3>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              Has this <strong>{activeConvData?.item?.itemName}</strong> been successfully returned to its verified owner?
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeliveryModal(false)}
                className="py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkDelivered}
                className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white shadow-md"
              >
                Yes, Mark Delivered
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ITEM REUNITED Success Modal */}
      {deliverySuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-md fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center space-y-4 border border-gray-100 shadow-2xl">
            <div className="text-5xl mb-2 animate-bounce">🎉</div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">ITEM REUNITED!</h2>
            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              Another item has found its way back to its owner. <br />
              <strong className="text-blue-600">Find What Matters. Return What Belongs.</strong>
            </p>
            <div className="pt-4">
              <button
                onClick={() => setDeliverySuccess(false)}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg"
              >
                Continue (LostLink ✓)
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
