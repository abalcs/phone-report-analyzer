/* eslint-disable no-dupe-keys */
import React, { useState,useEffect } from "react";
import Papa from "papaparse";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";


export default function AgentChartsUploader() {
  const [callsData, setCallsData] = useState([]);
  const [percentData, setPercentData] = useState([]);
  const [noAnswerData, setNoAnswerData] = useState([]);

  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem("theme");
    return savedMode === "dark";
  });  

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
    document.body.className = darkMode ? 'dark-mode' : 'light-mode'; // for full page theming
  }, [darkMode]);

  useEffect(() => {
    document.body.className = darkMode ? 'dark-mode' : 'light-mode';
  }, [darkMode]);

  const exportToPDF = () => {
    const input = document.body; // or use a specific wrapper div
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, width, height);
      pdf.save("agent-report.pdf");
    });
  };

  const labelStyle = { fontSize: 10, fill: darkMode ? '#f1f5f9' : '#555' };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const rawData = data.slice(2);
        const calls = [], percents = [], noAnswers = [];

        rawData.forEach(row => {
          const agent = row[1]?.trim();
          const outboundCalls = parseInt(row[3], 10);
          const noAnswer = parseInt(row[4], 10);
          const percentage = parseFloat(row[10]?.replace('%', ''));

          if (!agent) return;

          if (!isNaN(outboundCalls)) calls.push({ Agent: agent, OutboundCalls: outboundCalls });
          if (!isNaN(noAnswer)) noAnswers.push({ Agent: agent, NoAnswers: noAnswer });
          if (!isNaN(percentage)) percents.push({ Agent: agent, PercentageAvailable: percentage });
        });

        setCallsData(calls.sort((a, b) => b.OutboundCalls - a.OutboundCalls));
        setNoAnswerData(noAnswers.sort((a, b) => b.NoAnswers - a.NoAnswers));
        setPercentData(percents.sort((a, b) => b.PercentageAvailable - a.PercentageAvailable));
      }
    });
  };

  function getTopPercentile(data, key, percent = 0.5) {
    const count = Math.ceil(data.length * percent);
    return new Set(
      [...data]
        .sort((a, b) => b[key] - a[key])
        .slice(0, count)
        .map((item) => item.Agent)
    );
  }
  
  function getBottomPercentile(data, key, percent = 0.5) {
    const count = Math.ceil(data.length * percent);
    return new Set(
      [...data]
        .sort((a, b) => a[key] - b[key])
        .slice(0, count)
        .map((item) => item.Agent)
    );
  }
  
  function renderEliteAgentList(agents) {
    return (
      <div className="card" style={{ padding: "1rem", fontSize: "0.95rem", textAlign: 'center'}}>
        <h3 className="subtitle" style={{ textAlign: 'left', color: '#2563eb', textAlign: 'center'}}>
          🌟 Elite Agents (Top 50% Calls & Availability, Bottom 50% No Answers)
        </h3>
        {agents.length > 0 ? (
          <ul style={{ paddingLeft: "1.2rem", color: "#333" }}>
            {agents.map((agent, i) => (
              <li key={i}>
                {agent.Agent} — 📞 Outbound Calls {agent.OutboundCalls}, 📵 RONA's {agent.NoAnswers}, 🕒 Availability {agent.PercentageAvailable.toFixed(2)}%
              </li>
            ))}
          </ul>
        ) : (
          <p>No agents matched all criteria.</p>
        )}
      </div>
    );
  }  

  function getBottomHalf(data, key) {
    const count = Math.floor(data.length / 2);
    return new Set(
      [...data]
        .sort((a, b) => a[key] - b[key])
        .slice(0, count)
        .map((item) => item.Agent)
    );
  }
  
  function getTopHalf(data, key) {
    const count = Math.ceil(data.length / 2);
    return new Set(
      [...data]
        .sort((a, b) => b[key] - a[key])
        .slice(0, count)
        .map((item) => item.Agent)
    );
  }

  function renderLowAgentList(agents) {
    return (
      <div className="card" style={{ padding: "1rem", fontSize: "0.95rem" }}>
        <h3 className="subtitle" style={{ textAlign: 'center', color: '#b91c1c' }}>
          🚨 At-Risk Agents (Bottom 50% Calls & Availability, Top 50% No Answers)
        </h3>
        {agents.length > 0 ? (
          <ul style={{ paddingLeft: "1.2rem", color: "#333", textAlign: 'center' }}>
            {agents.map((agent, i) => (
              <li key={i}>
                {agent.Agent} — 📞 Outbound Calls {agent.OutboundCalls}, 📵 RONA's {agent.NoAnswers}, 🕒 Availability {agent.PercentageAvailable.toFixed(2)}%
              </li>
            ))}
          </ul>
        ) : (
          <p>No agents matched all criteria.</p>
        )}
      </div>
    );
  }  

  const renderAgentAverages = () => {
    if (!callsData.length || !noAnswerData.length || !percentData.length) return null;
  
    const average = (arr, key) => {
      if (!arr.length) return 0;
      const total = arr.reduce((sum, entry) => sum + (entry[key] || 0), 0);
      return total / arr.length;
    };
  
    const outboundAvg = average(callsData, "OutboundCalls");
    const noAnswerAvg = average(noAnswerData, "NoAnswers");
    const availabilityAvg = average(percentData, "PercentageAvailable");
  
    return (
      <div className="card" style={{ padding: "1rem", fontSize: "0.95rem", textAlign: 'center'}}>
        <h3 className="subtitle" style={{ textAlign: 'left', color: '#0d9488', textAlign: 'center'}}>
          📈 Agent Metric Averages
        </h3>
        <ul style={{ paddingLeft: "1.2rem" }}>
          <li>📞 Outbound Calls Avg: <strong>{outboundAvg.toFixed(2)}</strong></li>
          <li>📵 No Answers Avg: <strong>{noAnswerAvg.toFixed(2)}</strong></li>
          <li>🕒 Availability Avg: <strong>{availabilityAvg.toFixed(2)}%</strong></li>
        </ul>
      </div>
    );
  };  

  return (
      <div className="container">
        <div className="card">
        <button
              onClick={toggleDarkMode}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                marginBottom: "1rem",
                backgroundColor: darkMode ? "#1f2937" : "#f3f4f6",
                color: darkMode ? "#f9fafb" : "#1f2937",
                border: "1px solid #ccc",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              {darkMode ? "🌞 Light Mode" : "🌙 Dark Mode"}
            </button>
          <h1 className="title">📊 Phone Report Analytics Dashboard</h1>
          <p className="subtitle">Upload a CSV file to visualize agent performance statistics.</p>
          <div className="upload-input">
            <input type="file" accept=".csv" onChange={handleUpload} />
          </div>
          <div className="PDFexport">
            <button
              onClick={exportToPDF}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                marginLeft: "1rem",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                cursor: "pointer"
              }}
            >
              📄 Export PDF
            </button>
          </div>
        </div>

        {renderAgentAverages()}

        {callsData.length > 0 && (
          <div className="card">
            <h2 className="subtitle">🔊 Outbound Calls by Agent</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={callsData}>
                <XAxis dataKey="Agent" angle={-45} textAnchor="end" interval={0} height={120} tick={{ fill: darkMode ? "#f1f5f9" : "#1f2937" }}
                />
                <YAxis tick={{ fill: darkMode ? "#f1f5f9" : "#1f2937" }}/>
                <Tooltip 
                contentStyle={{
                  backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                  borderColor: darkMode ? "#334155" : "#ccc",
                  color: darkMode ? "#f1f5f9" : "#1f2937"
                }}
                labelStyle={{
                  color: darkMode ? "#facc15" : "#4b5563"
                }}/>
                <Bar dataKey="OutboundCalls" fill="#6366f1">
                  <LabelList dataKey="OutboundCalls" position="top" style={labelStyle} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {noAnswerData.length > 0 && (
          <div className="card">
            <h2 className="subtitle">📵 No Answers by Agent</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={noAnswerData}>
                <XAxis dataKey="Agent" angle={-45} textAnchor="end" interval={0} height={120} tick={{ fill: darkMode ? "#f1f5f9" : "#1f2937" }}
                />
                <YAxis tick={{ fill: darkMode ? "#f1f5f9" : "#1f2937" }}/>
                <Tooltip 
                contentStyle={{
                  backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                  borderColor: darkMode ? "#334155" : "#ccc",
                  color: darkMode ? "#f1f5f9" : "#1f2937"
                }}
                labelStyle={{
                  color: darkMode ? "#facc15" : "#4b5563"
                }}
                />
                <Bar dataKey="NoAnswers" fill="#f97316">
                  <LabelList dataKey="NoAnswers" position="top" style={labelStyle}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {percentData.length > 0 && (
          <div className="card">
            <h2 className="subtitle">🕒 Percentage Available by Agent</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={percentData} barCategoryGap="2%">
                <XAxis dataKey="Agent" angle={-45} textAnchor="end" interval={0} height={120} tick={{ fill: darkMode ? "#f1f5f9" : "#1f2937" }}
                />
                <YAxis tick={{ fill: darkMode ? "#f1f5f9" : "#1f2937" }}/>
                <Tooltip 
                contentStyle={{
                  backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                  borderColor: darkMode ? "#334155" : "#ccc",
                  color: darkMode ? "#f1f5f9" : "#1f2937"
                }}
                labelStyle={{
                  color: darkMode ? "#facc15" : "#4b5563"
                }}
                formatter={(value) => `${value.toFixed(2)}%`} />
                <Bar dataKey="PercentageAvailable" fill="#10b981">
                <LabelList
                dataKey="PercentageAvailable"
                position="top"
                formatter={(v) => `${v.toFixed(1)}%`}
                style={labelStyle}
              />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {callsData.length > 0 && noAnswerData.length > 0 && percentData.length > 0 && (() => {
          const topCalls = getTopPercentile(callsData, "OutboundCalls");
          const topAvailability = getTopPercentile(percentData, "PercentageAvailable");
          const bottomNoAnswers = getBottomPercentile(noAnswerData, "NoAnswers");
        
          // Intersect all three sets
          const eliteAgents = callsData.filter(agent =>
            topCalls.has(agent.Agent) &&
            topAvailability.has(agent.Agent) &&
            bottomNoAnswers.has(agent.Agent)
          ).map(agent => {
            const noAns = noAnswerData.find(a => a.Agent === agent.Agent);
            const avail = percentData.find(a => a.Agent === agent.Agent);
            return {
              Agent: agent.Agent,
              OutboundCalls: agent.OutboundCalls,
              NoAnswers: noAns?.NoAnswers ?? 0,
              PercentageAvailable: avail?.PercentageAvailable ?? 0,
            };
          });
        
          return renderEliteAgentList(eliteAgents);
        })()}

        {callsData.length > 0 && noAnswerData.length > 0 && percentData.length > 0 && (() => {
          const bottomCalls = getBottomHalf(callsData, "OutboundCalls");
          const bottomAvailability = getBottomHalf(percentData, "PercentageAvailable");
          const topNoAnswers = getTopHalf(noAnswerData, "NoAnswers");
        
          const lowAgents = callsData.filter(agent =>
            bottomCalls.has(agent.Agent) &&
            bottomAvailability.has(agent.Agent) &&
            topNoAnswers.has(agent.Agent)
          ).map(agent => {
            const noAns = noAnswerData.find(a => a.Agent === agent.Agent);
            const avail = percentData.find(a => a.Agent === agent.Agent);
            return {
              Agent: agent.Agent,
              OutboundCalls: agent.OutboundCalls,
              NoAnswers: noAns?.NoAnswers ?? 0,
              PercentageAvailable: avail?.PercentageAvailable ?? 0,
            };
          });
        
          return renderLowAgentList(lowAgents);
        })()}      
      </div>  
  );
}