/* eslint-disable */
// PAS v1 - 그리드 방식 (배치 버튼)
import { useState, useMemo, useRef, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBr-Vq8kDPrxNv8RojdrPa_GUgXth2tHmg",
  authDomain: "teamnight-d909b.firebaseapp.com",
  databaseURL: "https://teamnight-d909b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "teamnight-d909b",
  storageBucket: "teamnight-d909b.firebasestorage.app",
  messagingSenderId: "440378727824",
  appId: "1:440378727824:web:2c4bf51c6c57f8f7d96715"
};

let fdb = null;
try { fdb = getDatabase(initializeApp(firebaseConfig)); } catch (e) {}
const dbSet = (p, val) => { 
  try { 
    if (fdb) {
      set(ref(fdb, p), val)
        .then(() => console.log("Firebase write OK:", p))
        .catch(e => console.error("Firebase write FAIL:", p, e));
    } else {
      console.error("fdb is null!");
    }
  } catch (e) { console.error("dbSet error:", e); } 
};

const EDIT_PASSWORD = "003"; // 수정 비밀번호

const ZONES = ["상부", "하부", "B", "C", "D", "P/Z", "T", "W", "V"];
const ZONE_COLORS = {
  "상부": "#7c3aed", "하부": "#2563eb", "B": "#ea580c", "C": "#0891b2",
  "D": "#dc2626", "P/Z": "#059669", "T": "#db2777", "W": "#65a30d", "V": "#6366f1",
};

try {
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css";
  document.head.appendChild(fontLink);
} catch (e) {}

const initData = () => {
  try { const s = localStorage.getItem("pas_v1_data");
    if (s) {
      const d = JSON.parse(s);
      if (d["P"] !== undefined && d["P/Z"] === undefined) { d["P/Z"] = d["P"]; delete d["P"]; }
      if (d["Z"] !== undefined && d["V"] === undefined) { d["V"] = d["Z"]; delete d["Z"]; }
      if (d["V"] === undefined) d["V"] = { done: "", picking: false };
      return d;
    } } catch (e) {}
  const d = {}; ZONES.forEach(z => { d[z] = { done: "", picking: false }; }); return d;
};
const initTotal = () => { try { return parseInt(localStorage.getItem("pas_v1_total")) || 100; } catch (e) { return 100; } };

function CircleProgress({ percent, color, size = 90 }) {
  const r = (size - 10) / 2, circ = 2 * Math.PI * r, dash = (percent / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.5s ease" }} />
    </svg>
  );
}

export default function App() {
  const [totalBatches, setTotalBatches] = useState(initTotal);
  const [tempTotal, setTempTotal] = useState(() => String(initTotal()));
  const [data, setData] = useState(initData);
  const [activeZone, setActiveZone] = useState(ZONES[0]);
  const [activeBatch, setActiveBatch] = useState(1);
  const [copied, setCopied] = useState(false);
  const [editable, setEditable] = useState(() => {
    try { return localStorage.getItem("pas_editable") === "true"; } catch (e) { return false; }
  });
  const [showPwInput, setShowPwInput] = useState(false);
  const [pwValue, setPwValue] = useState("");

  const tryUnlock = () => {
    if (pwValue === EDIT_PASSWORD) {
      setEditable(true);
      try { localStorage.setItem("pas_editable", "true"); } catch (e) {}
      setShowPwInput(false); setPwValue("");
    } else {
      setPwValue("");
    }
  };

  const lockEdit = () => {
    setEditable(false);
    try { localStorage.setItem("pas_editable", "false"); } catch (e) {}
  };

  const inputPanelRef = useRef(null);

  const editableRef = useRef(editable);
  useEffect(() => { editableRef.current = editable; }, [editable]);

  const saveData = (d, changedZone) => {
    const isEditable = editable || (typeof localStorage !== "undefined" && localStorage.getItem("pas_editable") === "true");
    if (!isEditable) return;
    setData(d);
    try { localStorage.setItem("pas_v1_data", JSON.stringify(d)); } catch (e) {}
    if (changedZone && d[changedZone]) {
      const fbKey = changedZone.replace(/\//g, "_");
      dbSet(`pas/data/${fbKey}`, d[changedZone]);
    } else {
      ZONES.forEach(z => { if (d[z]) { const fbKey = z.replace(/\//g, "_"); dbSet(`pas/data/${fbKey}`, d[z]); } });
    }
  };
  const selectBatch = (b) => { setActiveBatch(b); saveData({ ...data, [activeZone]: { ...(data[activeZone]||{}), done: b } }, activeZone); setTimeout(() => inputPanelRef.current && inputPanelRef.current.scrollIntoView({ behavior: "smooth", block: "center" }), 50); };
  const handleDoneChange = (zone, val) => { const num = val === "" ? "" : Math.min(totalBatches, Math.max(0, parseInt(val) || 0)); saveData({ ...data, [zone]: { ...(data[zone]||{}), done: num } }, zone); };
  const togglePicking = (zone) => {
    const newPicking = !(data[zone]||{done:"",picking:false}).picking;
    saveData({ ...data, [zone]: { ...(data[zone]||{}), picking: newPicking, done: newPicking ? totalBatches : (data[zone]||{done:"",picking:false}).done } }, zone);
  };
  const [resetConfirm, setResetConfirm] = useState(false);
  const resetAll = () => {
    if (!resetConfirm) { setResetConfirm(true); setTimeout(() => setResetConfirm(false), 3000); return; }
    const d = {}; ZONES.forEach(z => { d[z] = { done: "", picking: false }; }); saveData(d); setResetConfirm(false);
  };

  const zoneTotals = useMemo(() => {
    const out = {};
    ZONES.forEach(z => {
      const zd = data[z] || { done: "", picking: false };
      const rawDone = zd.done;
      const done = (rawDone === "" || rawDone === undefined || rawDone === null) ? 0 : (Number(rawDone) || 0);
      out[z] = { done, pct: totalBatches > 0 ? Math.min(100, Math.round((done / totalBatches) * 100)) : 0 };
    });
    return out;
  }, [data, totalBatches]);


  const isWritingRef = useRef(false);

  // Firebase 실시간 구독
  useEffect(() => {
    if (!fdb) return;
    const subs = [];
    ZONES.forEach(z => {
      const fbKey = z.replace(/\//g, "_");
      subs.push(onValue(ref(fdb, `pas/data/${fbKey}`), snap => {
        const v = snap.val();
        if (v) {
          isWritingRef.current = true;
          setData(prev => {
            const next = { ...prev, [z]: v };
            try { localStorage.setItem("pas_v1_data", JSON.stringify(next)); } catch (e) {}
            return next;
          });
        }
      }));
    });
    subs.push(onValue(ref(fdb, "pas/total"), snap => {
      const v = snap.val();
      if (v) { setTotalBatches(v); setTempTotal(String(v)); }
    }));
    return () => subs.forEach(u => u());
  }, []);

  const grand = useMemo(() => {
    const doneAll = ZONES.reduce((s, z) => s + zoneTotals[z].done, 0);
    return { pct: totalBatches > 0 ? Math.round((doneAll / (totalBatches * ZONES.length)) * 100) : 0 };
  }, [zoneTotals, totalBatches]);



  useEffect(() => {
    dbSet("summary/pas", { pct: grand.pct, ts: Date.now() });
  }, [grand.pct, data]);

  const currentDone = (data[activeZone]||{done:"",picking:false}).done;
  const currentPct = currentDone !== "" && totalBatches > 0 ? Math.round((Number(currentDone) / totalBatches) * 100) : null;

  const getSummaryText = () => {
    const now = new Date(); const timeStr = `${now.getHours()}시${now.getMinutes().toString().padStart(2,"0")}분`;
    const month = now.getMonth() + 1; const dateNum = now.getDate();
    const lines = [`PAS (${timeStr})`, `${month}월${dateNum}일자 ${totalBatches}배치`, `──────────────`];

    // 존별 상태 계산
    const zoneStatus = {};
    ZONES.forEach(z => {
      const { done, pct } = zoneTotals[z];
      if ((data[z]||{done:"",picking:false}).picking) zoneStatus[z] = "완료";
      else if (pct === 100) zoneStatus[z] = "불출완료";
      else if (done > 0) zoneStatus[z] = `${done}배치 불출중`;
      else zoneStatus[z] = "미불출";
    });

    // 같은 상태끼리 묶기
    const statusGroups = {};
    ZONES.forEach(z => {
      const st = zoneStatus[z];
      if (!statusGroups[st]) statusGroups[st] = [];
      statusGroups[st].push(z);
    });

    const order = ["완료", "불출완료"];
    const sorted = Object.entries(statusGroups).sort(([a], [b]) => {
      const ai = order.indexOf(a) >= 0 ? order.indexOf(a) : a === "미불출" ? 999 : 50;
      const bi = order.indexOf(b) >= 0 ? order.indexOf(b) : b === "미불출" ? 999 : 50;
      return ai - bi;
    });

    sorted.forEach(([status, zones]) => {
      lines.push(`${zones.map(z => z.length<=1?z+"존":z).join("/")} : ${status}`);
    });

    lines.push(`──────────────`, `토탈 ${grand.pct}%`);
    return lines.join("\n");
  };

  const S = { bg: "#f0f4f8", card: "#ffffff", border: "#e2e8f0", text: "#0f172a", textSub: "#64748b", inputBg: "#f8fafc", shadow: "0 1px 8px rgba(0,0,0,0.08)", shadowMd: "0 2px 16px rgba(0,0,0,0.10)" };

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif", padding: "20px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: "0.08em", background: "linear-gradient(135deg,#059669,#d97706)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PAS</h1>
        <div style={{ fontSize: 10, color: S.textSub, marginTop: 3 }}>v1 · 그리드 방식</div>
        {/* 잠금 상태 */}
        <div style={{ marginTop: 10 }}>
          {editable ? (
            <button onClick={lockEdit} style={{ fontSize: 11, fontWeight: 700, padding: "5px 16px", borderRadius: 20, cursor: "pointer", background: "#dcfce7", border: "1px solid #86efac", color: "#15803d", fontFamily: "inherit" }}>
              🔓 수정 가능 · 탭하여 잠금
            </button>
          ) : showPwInput ? (
            <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
              <input type="password" inputMode="numeric" value={pwValue} autoFocus
                onChange={e => setPwValue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && tryUnlock()}
                placeholder="비밀번호"
                style={{ width: 100, background: "#fff", border: "1.5px solid #7c3aed", borderRadius: 10, padding: "6px 10px", fontSize: 14, fontWeight: 700, outline: "none", textAlign: "center", fontFamily: "inherit" }} />
              <button onClick={tryUnlock} style={{ fontSize: 12, fontWeight: 800, padding: "7px 14px", borderRadius: 10, cursor: "pointer", background: "#7c3aed", border: "none", color: "#fff", fontFamily: "inherit" }}>확인</button>
              <button onClick={() => { setShowPwInput(false); setPwValue(""); }} style={{ fontSize: 12, fontWeight: 700, padding: "7px 10px", borderRadius: 10, cursor: "pointer", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#94a3b8", fontFamily: "inherit" }}>취소</button>
            </div>
          ) : (
            <button onClick={() => setShowPwInput(true)} style={{ fontSize: 11, fontWeight: 700, padding: "5px 16px", borderRadius: 20, cursor: "pointer", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#94a3b8", fontFamily: "inherit" }}>
              🔒 보기 전용 · 탭하여 잠금해제
            </button>
          )}
        </div>
      </div>

      {/* 배치 설정 */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: "12px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, boxShadow: S.shadow }}>
        <div style={{ fontSize: 12, color: S.textSub, whiteSpace: "nowrap", fontWeight: 500 }}>오늘 배치</div>
        <input type="number" min={1} value={tempTotal} onChange={e => setTempTotal(e.target.value)} onBlur={applyTotal} onKeyDown={e => e.key === "Enter" && applyTotal()}
          style={{ width: 70, background: S.inputBg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "6px 6px", color: S.text, fontSize: 17, fontWeight: 700, outline: "none", textAlign: "center", fontFamily: "inherit" }} />
        <button onClick={() => { }} style={{ marginLeft: "auto", background: S.inputBg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: S.textSub, fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>💬 카톡</button>
      </div>

      {/* Grand Total */}
      <div style={{ background: "linear-gradient(135deg,#059669,#d97706)", borderRadius: 16, padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 20, boxShadow: "0 4px 20px rgba(5,150,105,0.3)" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <CircleProgress percent={grand.pct} color="#ffffff" size={90} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{grand.pct}%</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 4 }}>전체 토탈 피킹작업률</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{grand.pct}% <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>/ {totalBatches}배치</span></div>
          <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
            {ZONES.map(z => <span key={z} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 20, background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}>{z} {zoneTotals[z].pct}%</span>)}
          </div>
        </div>
      </div>

      {/* Zone Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
        {ZONES.map(z => {
          const { done, pct } = zoneTotals[z]; const isActive = z === activeZone; const isPicking = (data[z]||{done:"",picking:false}).picking; const isBul = pct === 100 && !isPicking; const color = ZONE_COLORS[z];
          return (
            <div key={z} style={{ background: isActive ? color+"12" : S.card, border: `1.5px solid ${isActive ? color : S.border}`, borderRadius: 12, padding: "10px 8px", textAlign: "center", boxShadow: S.shadow }}>
              <button onClick={() => setActiveZone(z)} style={{ background: "none", border: "none", cursor: "pointer", width: "100%", padding: 0 }}>
                <div style={{ fontSize: 12, color, fontWeight: 700, marginBottom: 4 }}>{z} 존</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: S.text }}>{pct}%</div>
                <div style={{ height: 4, background: "#e2e8f0", borderRadius: 2, margin: "6px 0 4px" }}><div style={{ height: 4, borderRadius: 2, background: color, width: `${pct}%`, transition: "width 0.4s" }} /></div>
                <div style={{ fontSize: 10, color: S.textSub, marginBottom: 6 }}>{done} / {totalBatches}</div>
              </button>
              <button onClick={() => togglePicking(z)} style={{ width: "100%", fontSize: 10, fontWeight: 800, padding: "5px 0", borderRadius: 7, cursor: "pointer", transition: "all 0.15s", background: isPicking ? "#dcfce7" : "#f8fafc", border: `1.5px solid ${isPicking ? "#86efac" : "#e2e8f0"}`, color: isPicking ? "#15803d" : "#94a3b8" }}>
                {isPicking ? "✓ 피킹완료" : "피킹완료"}
              </button>
            </div>
          );
        })}
      </div>

      {/* 입력 패널 */}
      <div ref={inputPanelRef} style={{ background: S.card, border: `1.5px solid ${ZONE_COLORS[activeZone]}`, borderRadius: 16, padding: 16, marginBottom: 20, boxShadow: S.shadowMd }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}><span style={{ color: ZONE_COLORS[activeZone] }}>{activeZone} 존</span><span style={{ color: S.textSub, marginLeft: 6 }}>완료 배치 입력</span></div>
          <div style={{ fontSize: 11, fontWeight: 700, background: currentDone !== "" ? ZONE_COLORS[activeZone]+"15" : S.inputBg, color: currentDone !== "" ? ZONE_COLORS[activeZone] : S.textSub, border: `1px solid ${currentDone !== "" ? ZONE_COLORS[activeZone]+"44" : S.border}`, borderRadius: 20, padding: "4px 10px" }}>
            {currentDone !== "" ? `${totalBatches}배치 중 ${currentDone}완료` : "미입력"}
          </div>
        </div>
        {/* 배치 그리드 - 10개씩 행 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 3, marginBottom: 14 }}>
          {Array.from({ length: totalBatches }, (_, i) => i + 1).map(b => {
            const done = (data[activeZone]||{done:"",picking:false}).done; const completed = done !== "" && b <= Number(done); const isAct = activeBatch === b;
            return (
              <button key={b} onClick={() => selectBatch(b)} style={{ background: isAct ? ZONE_COLORS[activeZone] : completed ? ZONE_COLORS[activeZone]+"25" : S.inputBg, border: `1px solid ${isAct ? ZONE_COLORS[activeZone] : completed ? ZONE_COLORS[activeZone]+"55" : S.border}`, borderRadius: 5, padding: "5px 1px", cursor: "pointer", color: isAct ? "#fff" : completed ? ZONE_COLORS[activeZone] : S.textSub, fontSize: 10, fontWeight: 700, transition: "all 0.1s", fontFamily: "inherit" }}>{b}</button>
            );
          })}
        </div>
        <div style={{ background: S.inputBg, borderRadius: 12, padding: "14px 18px", border: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: S.textSub, marginBottom: 6 }}>완료 배치 수</div>
            <input type="number" min={0} max={totalBatches} value={currentDone} onChange={e => handleDoneChange(activeZone, e.target.value)} placeholder="0"
              style={{ width: "100%", background: S.card, border: `1.5px solid ${ZONE_COLORS[activeZone]}`, borderRadius: 10, padding: "10px 14px", color: S.text, fontSize: 22, fontWeight: 900, outline: "none", boxSizing: "border-box", textAlign: "center", fontFamily: "inherit" }} />
          </div>
          <div style={{ textAlign: "center", paddingTop: 20 }}><div style={{ color: S.textSub, fontSize: 18 }}>/</div><div style={{ fontSize: 10, color: S.textSub }}>중</div></div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: S.textSub, marginBottom: 6 }}>전체 배치</div>
            <div style={{ background: S.card, borderRadius: 10, padding: "10px 14px", fontSize: 22, fontWeight: 900, color: S.textSub, border: `1px solid ${S.border}` }}>{totalBatches}</div>
          </div>
          <div style={{ minWidth: 52, textAlign: "center", paddingTop: 20, fontSize: 22, fontWeight: 900, color: currentPct !== null ? ZONE_COLORS[activeZone] : "#cbd5e1" }}>{currentPct !== null ? `${currentPct}%` : "–"}</div>
        </div>
        {currentDone !== "" && <div style={{ marginTop: 10, textAlign: "center", fontSize: 13, fontWeight: 700, color: ZONE_COLORS[activeZone] }}>총 {totalBatches}배치 중 {currentDone}배치 완료 ({currentPct}%)</div>}
      </div>

      {/* 존별 요약 */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 16, boxShadow: S.shadow }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: S.text, marginBottom: 12 }}>존별 요약</div>
        <div style={{ background: S.inputBg, borderRadius: 10, padding: "12px 14px", marginBottom: 10, fontSize: 12, lineHeight: 1.8, color: S.textSub, fontFamily: "monospace", whiteSpace: "pre-wrap", border: `1px solid ${S.border}` }}>{getSummaryText()}</div>
        <button onClick={() => { navigator.clipboard.writeText(getSummaryText()).then(() => setCopied(true)); setTimeout(() => setCopied(false), 2000); }}
          style={{ width: "100%", background: copied ? "#059669" : "linear-gradient(135deg,#059669,#d97706)", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 700, marginBottom: 14, fontFamily: "inherit" }}>
          {copied ? "✓ 복사됨!" : "📤 현황 공유"}
        </button>
        {ZONES.filter(z => zoneTotals[z].pct === 100 && !(data[z]||{done:"",picking:false}).picking).length > 0 && (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <div><div style={{ fontSize: 11, color: "#15803d", fontWeight: 700 }}>불출완료</div>
              <div style={{ fontSize: 14, fontWeight: 900 }}>{ZONES.filter(z => zoneTotals[z].pct === 100 && !(data[z]||{done:"",picking:false}).picking).map((z,i,arr) => <span key={z}><span style={{ color: ZONE_COLORS[z] }}>{z.length<=1?z+"존":z}</span>{i<arr.length-1&&<span style={{ color: "#94a3b8" }}> · </span>}</span>)}</div>
            </div>
          </div>
        )}
        {ZONES.filter(z => (data[z]||{done:"",picking:false}).picking).length > 0 && (
          <div style={{ background: "#fefce8", border: "1px solid #fde047", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 16 }}>🟡</span>
            <div><div style={{ fontSize: 11, color: "#a16207", fontWeight: 700 }}>피킹완료</div>
              <div style={{ fontSize: 14, fontWeight: 900 }}>{ZONES.filter(z => (data[z]||{done:"",picking:false}).picking).map((z,i,arr) => <span key={z}><span style={{ color: ZONE_COLORS[z] }}>{z.length<=1?z+"존":z}</span>{i<arr.length-1&&<span style={{ color: "#94a3b8" }}> · </span>}</span>)}</div>
            </div>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ZONES.filter(z => !(data[z]||{done:"",picking:false}).picking && zoneTotals[z].pct < 100).map(z => {
            const { done, pct } = zoneTotals[z];
            return (
              <div key={z} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: ZONE_COLORS[z], minWidth: 32 }}>{z}</div>
                <div style={{ flex: 1, height: 8, background: "#e2e8f0", borderRadius: 4 }}><div style={{ height: 8, borderRadius: 4, background: ZONE_COLORS[z], width: `${pct}%`, transition: "width 0.4s" }} /></div>
                <div style={{ fontSize: 13, fontWeight: 800, minWidth: 40, textAlign: "right", color: S.text }}>{pct}%</div>
                <div style={{ fontSize: 11, color: S.textSub, minWidth: 80, textAlign: "right" }}>{done} / {totalBatches}</div>
              </div>
            );
          })}
        </div>
      </div>
      <button onClick={resetAll} style={{ width: "100%", background: resetConfirm ? "#fee2e2" : S.card, border: `1px solid ${resetConfirm ? "#dc2626" : "#fecaca"}`, borderRadius: 12, padding: "12px 0", cursor: "pointer", color: "#dc2626", fontSize: 13, fontWeight: 700, marginTop: 16, boxShadow: S.shadow, fontFamily: "inherit" }}>
        {resetConfirm ? "한 번 더 탭하면 초기화됩니다" : "🔄 전체 초기화"}
      </button>
    </div>
  );
}
