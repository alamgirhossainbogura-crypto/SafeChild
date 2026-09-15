import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

// Recenters the map whenever the live GPS position updates
function RecenterOnMove({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

export default function App() {
  const [lat, setLat] = useState<number>(23.6850);
  const [lng, setLng] = useState<number>(90.3563);
  const [accuracy, setAccuracy] = useState<number>(50);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'হ্যালো! আমি SafeChild ফার্স্ট এইড AI। যেকোনো জরুরি পরিস্থিতিতে প্রাথমিক চিকিৎসার জন্য আমাকে জিজ্ঞাসা করো।' }
  ]);
  const [contacts, setContacts] = useState({
    primary: localStorage.getItem('primary_contact') || '',
    secondary: localStorage.getItem('secondary_contact') || ''
  });
  const [lastHeard, setLastHeard] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const lastTriggerRef = useRef<number>(0);

  // ---- জিওলোকেশন ----
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLat(position.coords.latitude);
          setLng(position.coords.longitude);
          setAccuracy(position.coords.accuracy);
        },
        (error) => console.error('Geolocator Error:', error),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // ---- App খোলার সাথে সাথে mic + notification permission চাওয়া ----
  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then((stream) => stream.getTracks().forEach((t) => t.stop()))
      .catch((err) => console.warn('Mic permission not granted yet:', err));

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const notify = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  };

  // ---- কল করার ফাংশন ----
  const callContact = (number: string, label: string) => {
    if (!number) {
      alert(`${label} সেট করা নেই — নিচে Save Contacts-এ গিয়ে নম্বর যোগ করো।`);
      return;
    }
    notify('SafeChild SOS', `${label}-এ কল করা হচ্ছে...`);
    window.location.href = `tel:${number}`;
  };

  const callNational = () => {
    notify('SafeChild SOS', '৯৯৯ জাতীয় জরুরি সেবায় কল করা হচ্ছে...');
    window.location.href = 'tel:999';
  };

  // ---- ভয়েস রিকগনিশন: "Help" শুনলেই সাথে সাথে কল ----
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (isListening) alert('তোমার ব্রাউজার ভয়েস রিকগনিশন সাপোর্ট করে না। Chrome ব্যবহার করো।');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim().toLowerCase();
        setLastHeard(transcript);
        console.log('Heard:', transcript);

        if (transcript.includes('help')) {
          const now = Date.now();
          if (now - lastTriggerRef.current > 5000) {
            lastTriggerRef.current = now;
            const target = contacts.primary || contacts.secondary;
            const label = contacts.primary ? 'Emergency Contact 1' : 'Emergency Contact 2';
            if (target) {
              callContact(target, label);
            } else {
              callNational();
            }
          }
        }
      }
    };

    recognition.onerror = (e: any) => {
      console.error('Speech recognition error:', e.error);
      if (e.error === 'not-allowed') {
        alert('মাইক্রোফোন পারমিশন দেওয়া হয়নি। ব্রাউজার সেটিংস থেকে অনুমতি দাও।');
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (isListening) {
        try { recognition.start(); } catch { /* already running */ }
      }
    };

    recognitionRef.current = recognition;

    if (isListening) {
      try { recognition.start(); } catch { /* ignore */ }
    }

    return () => {
      recognition.onend = null;
      recognition.stop();
    };
  }, [isListening, contacts.primary, contacts.secondary]);

  const handleBotQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', text: chatInput }]);
    setChatInput('');

    try {
      const res = await fetch('/api/gemini-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: chatInput })
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Server responded ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);

      if (data.escalate) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: '⚠️ এটা জরুরি মনে হচ্ছে — এখনই ৯৯৯ এ কল করো অথবা অভিভাবক/ডাক্তারকে ডাকো।' }
        ]);
      }
    } catch (err) {
      console.error('Chat request failed:', err);
      setMessages((prev) => [...prev, { role: 'assistant', text: 'দুঃখিত, উত্তর পাওয়া যায়নি। নেটওয়ার্ক কানেকশন চেক করো। জরুরি প্রয়োজনে ডাক্তার বা ৯৯৯ এ কল করো।' }]);
    }
  };

  const saveContacts = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('primary_contact', contacts.primary);
    localStorage.setItem('secondary_contact', contacts.secondary);
    alert('Emergency Contacts Saved Locally! 🛡️');
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px', minHeight: '100vh' }}>
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ color: '#00D2D3', fontSize: '24px', fontWeight: 'bold' }}>🛡️ SafeChild</h1>
        <p style={{ color: '#94A3B8', fontSize: '12px' }}>AI Safety Ecosystem for BD</p>
      </header>

      {/* Real Leaflet Live GPS Map */}
      <div className="neon-border-cyan" style={{ height: '220px', borderRadius: '12px', marginBottom: '20px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1000, backgroundColor: 'rgba(15,23,42,0.85)', border: '1px solid #00D2D3', borderRadius: '20px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00D2D3', boxShadow: '0 0 6px #00D2D3' }} />
          <span style={{ color: '#00D2D3', fontSize: '11px', fontWeight: 600 }}>Live GPS Active</span>
        </div>

        <MapContainer center={[lat, lng]} zoom={16} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterOnMove lat={lat} lng={lng} />
          <Circle center={[lat, lng]} radius={Math.max(accuracy, 15)} pathOptions={{ color: '#00D2D3', fillColor: '#00D2D3', fillOpacity: 0.15 }} />
          <CircleMarker center={[lat, lng]} radius={9} pathOptions={{ color: '#0F172A', weight: 3, fillColor: '#00D2D3', fillOpacity: 1 }} />
        </MapContainer>

        <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, backgroundColor: 'rgba(15,23,42,0.85)', borderRadius: '10px', padding: '4px 10px' }}>
          <p style={{ color: '#94A3B8', fontSize: '11px' }}>{lat.toFixed(4)}°N, {lng.toFixed(4)}°E</p>
        </div>
      </div>

      {/* Start/Stop ভয়েস টগল */}
      <button
        onClick={() => setIsListening(!isListening)}
        style={{
          width: '100%', padding: '14px', borderRadius: '25px', border: 'none', marginBottom: '16px',
          backgroundColor: isListening ? '#00D2D3' : '#334155', color: isListening ? '#0F172A' : '#fff',
          fontWeight: 700, cursor: 'pointer', fontSize: '15px'
        }}
      >
        {isListening ? `🎙️ শোনা হচ্ছে... ("${lastHeard || 'help'}" বললে কল যাবে)` : '🎤 Start Voice SOS'}
      </button>

      {/* দুইটা আলাদা কন্টাক্ট কল বাটন */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <button onClick={() => callContact(contacts.primary, 'Emergency Contact 1')} style={{ flex: 1, padding: '18px', border: 'none', borderRadius: '14px', backgroundColor: '#FF4757', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          📞 Contact 1
        </button>
        <button onClick={() => callContact(contacts.secondary, 'Emergency Contact 2')} style={{ flex: 1, padding: '18px', border: 'none', borderRadius: '14px', backgroundColor: '#FF4757', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          📞 Contact 2
        </button>
      </div>

      {/* 999 বাটন */}
      <button onClick={callNational} style={{ width: '100%', padding: '14px', border: '1px solid #FF4757', borderRadius: '12px', backgroundColor: 'transparent', color: '#FF4757', fontWeight: 700, cursor: 'pointer', marginBottom: '20px' }}>
        📞 Call 999 (National Emergency)
      </button>

      {/* Save Contacts ফর্ম */}
      <form onSubmit={saveContacts} style={{ backgroundColor: '#1E293B', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '10px', color: '#00D2D3' }}>⚙️ Setup Guardian Contacts</h3>
        <input type="tel" placeholder="Primary Guardian Number" value={contacts.primary} onChange={(e) => setContacts({ ...contacts, primary: e.target.value })} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #334155', background: '#0F172A', color: '#fff' }} />
        <input type="tel" placeholder="Secondary Guardian Number" value={contacts.secondary} onChange={(e) => setContacts({ ...contacts, secondary: e.target.value })} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0F172A', color: '#fff' }} />
        <button type="submit" style={{ width: '100%', padding: '8px', border: 'none', borderRadius: '6px', backgroundColor: '#334155', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Configurations</button>
      </form>

      {/* Chatbot */}
      <div style={{ backgroundColor: '#1E293B', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
        <h3 style={{ fontSize: '14px', color: '#00D2D3', marginBottom: '10px' }}>🤖 First Aid AI (Gemini 2.5 Flash)</h3>
        <div style={{ height: '140px', overflowY: 'auto', backgroundColor: '#0F172A', padding: '10px', borderRadius: '8px', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: m.role === 'user' ? '#1E293B' : '#334155', padding: '8px 12px', borderRadius: '8px', maxWidth: '85%', fontSize: '13px' }}>
              {m.text}
            </div>
          ))}
        </div>
        <form onSubmit={handleBotQuery} style={{ display: 'flex', gap: '8px' }}>
          <input type="text" placeholder="সিম্পটম লিখুন (যেমন: কাটা হাত বা পোড়া)..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0F172A', color: '#fff', fontSize: '13px' }} />
          <button type="submit" style={{ padding: '10px 16px', backgroundColor: '#00D2D3', border: 'none', borderRadius: '6px', color: '#0F172A', fontWeight: 'bold', cursor: 'pointer' }}>Send</button>
        </form>
        <div style={{ marginTop: '12px', border: '1px solid #EAB308', padding: '8px', borderRadius: '6px', backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
          <p style={{ color: '#EAB308', fontSize: '11px', lineHeight: '1.4' }}>⚠️ <strong>Disclaimer:</strong> এই AI শুধু সাময়িক ফার্স্ট এইড পরামর্শ দেয়, ডাক্তারের চিকিৎসার বিকল্প না।</p>
        </div>
      </div>
    </div>
  );
}
