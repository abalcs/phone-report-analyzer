import React, { useState } from "react";
import Papa from "papaparse";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList
} from "recharts";

export default function AgentChartsUploader() {
  const [callsData, setCallsData] = useState([]);
  const [percentData, setPercentData] = useState([]);
  const [noAnswerData, setNoAnswerData] = useState([]);

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
      <div className="card" style={{ padding: "1rem", fontSize: "0.95rem" }}>
        <h3 className="subtitle" style={{ textAlign: 'left', color: '#2563eb' }}>
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
        <h3 className="subtitle" style={{ textAlign: 'left', color: '#b91c1c' }}>
          🚨 At-Risk Agents (Bottom 50% Calls & Availability, Top 50% No Answers)
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

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">📊 Agent Analytics Dashboard</h1>
        <p className="subtitle">Upload a CSV file to visualize agent performance statistics.</p>
        <div className="upload-input">
          <input type="file" accept=".csv" onChange={handleUpload} />
        </div>
      </div>

      {callsData.length > 0 && (
        <div className="card">
          <h2 className="subtitle">🔊 Outbound Calls by Agent</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={callsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Agent" angle={-45} textAnchor="end" interval={0} height={120} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="OutboundCalls" fill="#6366f1">
                <LabelList dataKey="OutboundCalls" position="top" />
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Agent" angle={-45} textAnchor="end" interval={0} height={120} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="NoAnswers" fill="#f97316">
                <LabelList dataKey="NoAnswers" position="top" />
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Agent" angle={-45} textAnchor="end" interval={0} height={120} />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
              <Bar dataKey="PercentageAvailable" fill="#10b981">
              <LabelList
              dataKey="PercentageAvailable"
              position="top"
              formatter={(v) => `${v.toFixed(1)}%`}
              style={{ fontSize: 10, fill: '#555' }}
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
