import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ref, onValue } from 'firebase/database';
import { db } from './firebase';

export default function GuardianView() {
  const [code, setCode] = useState('');
  const [watching, setWatching] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; updatedAt: number } | null>(null);

  useEffect(() => {
    if (!watching || !code) return;
    const locRef = ref(db, 'locations/' + code);
    const unsubscribe = onValue(locRef, (snapshot) => {
      setLocation(snapshot.val());
    });
    return () => unsubscribe();
  }, [watching, code]);

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px', minHeight: '100vh', color: '#fff' }}>
      <h1 style={{ color: '#00D2D3', fontSize: '22px', fontWeight: 'bold', marginBottom: '4px' }}>🛡️ Guardian View</h1>
      <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '20px' }}>সন্তানের অ্যাপে দেখানো ৬-সংখ্যার কোড দিন</p>

      {!watching && (
        <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) setWatching(true); }} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Guardian Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#1E293B', color: '#fff' }}
          />
          <button type="submit" style={{ padding: '12px 18px', border: 'none', borderRadius: '8px', backgroundColor: '#00D2D3', color: '#0F172A', fontWeight: 700 }}>
            দেখুন
          </button>
        </form>
      )}

      {watching && !location && <p style={{ color: '#94A3B8' }}>লোকেশনের অপেক্ষায়... (সন্তানের অ্যাপ খোলা আছে কিনা দেখুন)</p>}

      {watching && location && (
        <>
          <div style={{ height: '300px', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px', border: '1px solid #00D2D3' }}>
            <MapContainer center={[location.lat, location.lng]} zoom={16} style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <CircleMarker center={[location.lat, location.lng]} radius={9} pathOptions={{ color: '#0F172A', weight: 3, fillColor: '#FF4757', fillOpacity: 1 }} />
            </MapContainer>
          </div>
          <p style={{ color: '#94A3B8', fontSize: '12px' }}>
            শেষ আপডেট: {new Date(location.updatedAt).toLocaleTimeString('bn-BD')}
          </p>
        </>
      )}
    </div>
  );
}
