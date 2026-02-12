import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList
} from "recharts";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType, BorderStyle, WidthType, VerticalAlign, ShadingType, convertInchesToTwip } from "docx";
import { saveAs } from "file-saver";


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
    document.body.className = darkMode ? 'dark-mode' : 'light-mode';
  }, [darkMode]);

  const exportToWord = async () => {
    if (!callsData.length) return;

    const average = (arr, key) => {
      if (!arr.length) return 0;
      return arr.reduce((sum, entry) => sum + (entry[key] || 0), 0) / arr.length;
    };

    const outboundAvg = average(callsData, "OutboundCalls");
    const noAnswerAvg = average(noAnswerData, "NoAnswers");
    const availabilityAvg = average(percentData, "PercentageAvailable");

    // Calculate elite and at-risk agents
    const topCalls = getTopPercentile(callsData, "OutboundCalls");
    const topAvailability = getTopPercentile(percentData, "PercentageAvailable");
    const bottomNoAnswers = getBottomPercentile(noAnswerData, "NoAnswers");
    const bottomCalls = getBottomHalf(callsData, "OutboundCalls");
    const bottomAvailability = getBottomHalf(percentData, "PercentageAvailable");
    const topNoAnswers = getTopHalf(noAnswerData, "NoAnswers");

    const eliteAgents = callsData.filter(agent =>
      topCalls.has(agent.Agent) && topAvailability.has(agent.Agent) && bottomNoAnswers.has(agent.Agent)
    ).map(agent => ({
      Agent: agent.Agent,
      OutboundCalls: agent.OutboundCalls,
      NoAnswers: noAnswerData.find(a => a.Agent === agent.Agent)?.NoAnswers ?? 0,
      PercentageAvailable: percentData.find(a => a.Agent === agent.Agent)?.PercentageAvailable ?? 0,
    }));

    const atRiskAgents = callsData.filter(agent =>
      bottomCalls.has(agent.Agent) && bottomAvailability.has(agent.Agent) && topNoAnswers.has(agent.Agent)
    ).map(agent => ({
      Agent: agent.Agent,
      OutboundCalls: agent.OutboundCalls,
      NoAnswers: noAnswerData.find(a => a.Agent === agent.Agent)?.NoAnswers ?? 0,
      PercentageAvailable: percentData.find(a => a.Agent === agent.Agent)?.PercentageAvailable ?? 0,
    }));

    // Combine all agent data for full table
    const allAgents = callsData.map(agent => ({
      Agent: agent.Agent,
      OutboundCalls: agent.OutboundCalls,
      NoAnswers: noAnswerData.find(a => a.Agent === agent.Agent)?.NoAnswers ?? 0,
      PercentageAvailable: percentData.find(a => a.Agent === agent.Agent)?.PercentageAvailable ?? 0,
    }));

    // Column widths in DXA (1 inch = 1440 DXA, total page width ~9360 DXA for letter size with 1" margins)
    const colWidths = [3800, 1800, 1800, 1800]; // Agent name wider, metrics equal

    const createTable = (data, headers, headerColor = "2563EB") => {
      const headerRow = new TableRow({
        tableHeader: true,
        children: headers.map((h, idx) => new TableCell({
          width: { size: colWidths[idx], type: WidthType.DXA },
          shading: { fill: headerColor, type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            alignment: idx === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
            spacing: { before: 120, after: 120 },
            children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 22 })],
          })],
        })),
      });

      const dataRows = data.map((row, rowIdx) => new TableRow({
        children: [
          new TableCell({
            width: { size: colWidths[0], type: WidthType.DXA },
            shading: { fill: rowIdx % 2 === 0 ? "F3F4F6" : "FFFFFF", type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
              spacing: { before: 100, after: 100 },
              children: [new TextRun({ text: row.Agent, size: 20 })],
            })],
          }),
          new TableCell({
            width: { size: colWidths[1], type: WidthType.DXA },
            shading: { fill: rowIdx % 2 === 0 ? "F3F4F6" : "FFFFFF", type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 100, after: 100 },
              children: [new TextRun({ text: row.OutboundCalls.toString(), size: 20 })],
            })],
          }),
          new TableCell({
            width: { size: colWidths[2], type: WidthType.DXA },
            shading: { fill: rowIdx % 2 === 0 ? "F3F4F6" : "FFFFFF", type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 100, after: 100 },
              children: [new TextRun({ text: row.NoAnswers.toString(), size: 20 })],
            })],
          }),
          new TableCell({
            width: { size: colWidths[3], type: WidthType.DXA },
            shading: { fill: rowIdx % 2 === 0 ? "F3F4F6" : "FFFFFF", type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 100, after: 100 },
              children: [new TextRun({ text: row.PercentageAvailable.toFixed(1) + "%", size: 20 })],
            })],
          }),
        ],
      }));

      return new Table({
        width: { size: 9200, type: WidthType.DXA },
        columnWidths: colWidths,
        rows: [headerRow, ...dataRows],
      });
    };

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: [
          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: "Agent Performance Report", bold: true, size: 48, color: "1F2937" })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [new TextRun({
              text: `Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
              italics: true,
              size: 22,
              color: "6B7280"
            })],
          }),

          // Executive Summary
          new Paragraph({
            spacing: { before: 300, after: 200 },
            children: [new TextRun({ text: "Executive Summary", bold: true, size: 32, color: "059669" })],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "Total Agents Analyzed: ", size: 22 }),
              new TextRun({ text: callsData.length.toString(), bold: true, size: 22 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "Average Outbound Calls: ", size: 22 }),
              new TextRun({ text: outboundAvg.toFixed(1), bold: true, size: 22 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "Average No Answers (RONA): ", size: 22 }),
              new TextRun({ text: noAnswerAvg.toFixed(1), bold: true, size: 22 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 400 },
            children: [
              new TextRun({ text: "Average Availability: ", size: 22 }),
              new TextRun({ text: availabilityAvg.toFixed(1) + "%", bold: true, size: 22 }),
            ],
          }),

          // Elite Agents
          new Paragraph({
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: "Elite Agents", bold: true, size: 32, color: "2563EB" })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: "Top 50% in Calls & Availability, Bottom 50% in No Answers", italics: true, size: 20, color: "6B7280" })],
          }),
          ...(eliteAgents.length > 0
            ? [createTable(eliteAgents, ["Agent Name", "Outbound Calls", "No Answers", "Availability"], "2563EB")]
            : [new Paragraph({ children: [new TextRun({ text: "No agents met all elite criteria.", italics: true, size: 22 })] })]),
          new Paragraph({ spacing: { after: 400 } }),

          // At-Risk Agents
          new Paragraph({
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: "At-Risk Agents", bold: true, size: 32, color: "DC2626" })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: "Bottom 50% in Calls & Availability, Top 50% in No Answers", italics: true, size: 20, color: "6B7280" })],
          }),
          ...(atRiskAgents.length > 0
            ? [createTable(atRiskAgents, ["Agent Name", "Outbound Calls", "No Answers", "Availability"], "DC2626")]
            : [new Paragraph({ children: [new TextRun({ text: "No agents met all at-risk criteria.", italics: true, size: 22 })] })]),
          new Paragraph({ spacing: { after: 400 } }),

          // Complete Rankings
          new Paragraph({
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: "Complete Agent Rankings", bold: true, size: 32, color: "7C3AED" })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: "Sorted by Outbound Calls (Highest to Lowest)", italics: true, size: 20, color: "6B7280" })],
          }),
          createTable(allAgents, ["Agent Name", "Outbound Calls", "No Answers", "Availability"], "7C3AED"),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "agent-performance-report.docx");
  };

  const labelStyle = { fontSize: 10, fill: darkMode ? '#f1f5f9' : '#555' };

  const processData = (data) => {
    // Skip header rows (data starts at row 11, index 11)
    const rawData = data.slice(11);
    const calls = [], percents = [], noAnswers = [];

    rawData.forEach(row => {
      const agent = row[2]?.toString().trim();
      const roleOrLabel = row[1]?.toString().trim().toLowerCase();

      // Skip empty rows, subtotals, and totals
      if (!agent || roleOrLabel === 'subtotal' || roleOrLabel === 'total') return;

      const outboundCalls = parseInt(row[4], 10);
      const noAnswer = parseInt(row[5], 10);
      // Percentage is stored as decimal (0.29 = 29%), multiply by 100
      const percentage = parseFloat(row[11]) * 100;

      if (!isNaN(outboundCalls)) calls.push({ Agent: agent, OutboundCalls: outboundCalls });
      if (!isNaN(noAnswer)) noAnswers.push({ Agent: agent, NoAnswers: noAnswer });
      if (!isNaN(percentage)) percents.push({ Agent: agent, PercentageAvailable: percentage });
    });

    setCallsData(calls.sort((a, b) => b.OutboundCalls - a.OutboundCalls));
    setNoAnswerData(noAnswers.sort((a, b) => b.NoAnswers - a.NoAnswers));
    setPercentData(percents.sort((a, b) => b.PercentageAvailable - a.PercentageAvailable));
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: ({ data }) => processData(data)
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const binaryStr = event.target.result;
        const workbook = XLSX.read(binaryStr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        processData(data);
      };
      reader.readAsBinaryString(file);
    }
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
      <div className="agent-section elite">
        <h3>🌟 Elite Agents</h3>
        <p className="section-desc">Top 50% in Calls & Availability, Bottom 50% in No Answers</p>
        {agents.length > 0 ? (
          <ul className="agent-list">
            {agents.map((agent, i) => (
              <li key={i}>
                <span className="agent-name">{agent.Agent}</span>
                <span className="agent-stat">📞 {agent.OutboundCalls} calls</span>
                <span className="agent-stat">📵 {agent.NoAnswers} RONA</span>
                <span className="agent-stat">🕒 {agent.PercentageAvailable.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="section-desc">No agents matched all criteria.</p>
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
      <div className="agent-section at-risk">
        <h3>🚨 At-Risk Agents</h3>
        <p className="section-desc">Bottom 50% in Calls & Availability, Top 50% in No Answers</p>
        {agents.length > 0 ? (
          <ul className="agent-list">
            {agents.map((agent, i) => (
              <li key={i}>
                <span className="agent-name">{agent.Agent}</span>
                <span className="agent-stat">📞 {agent.OutboundCalls} calls</span>
                <span className="agent-stat">📵 {agent.NoAnswers} RONA</span>
                <span className="agent-stat">🕒 {agent.PercentageAvailable.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="section-desc">No agents matched all criteria.</p>
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
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{callsData.length}</div>
          <div className="stat-label">Total Agents</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📞</div>
          <div className="stat-value">{outboundAvg.toFixed(0)}</div>
          <div className="stat-label">Avg Outbound Calls</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📵</div>
          <div className="stat-value">{noAnswerAvg.toFixed(0)}</div>
          <div className="stat-label">Avg No Answers</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🕒</div>
          <div className="stat-value">{availabilityAvg.toFixed(1)}%</div>
          <div className="stat-label">Avg Availability</div>
        </div>
      </div>
    );
  };  

  return (
      <div className="container">
        {/* Header */}
        <div className="header-card">
          <div className="logo">📊</div>
          <h1>Phone Report Analytics</h1>
          <p>Upload your phone report to analyze agent performance metrics</p>

          <div className="actions-row">
            <div className="file-upload-wrapper">
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleUpload} />
            </div>
            <button
              className="btn btn-primary"
              onClick={exportToWord}
              disabled={!callsData.length}
            >
              📝 Export to Word
            </button>
            <button className="btn btn-secondary" onClick={toggleDarkMode}>
              {darkMode ? "🌞 Light" : "🌙 Dark"}
            </button>
          </div>
        </div>

        {renderAgentAverages()}

        {callsData.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-icon">📞</span>
              <h2>Outbound Calls by Agent</h2>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={callsData}>
                <XAxis dataKey="Agent" angle={-45} textAnchor="end" interval={0} height={120} tick={{ fill: darkMode ? "#f1f5f9" : "#1f2937", fontSize: 12 }} />
                <YAxis tick={{ fill: darkMode ? "#f1f5f9" : "#1f2937" }}/>
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                    borderColor: darkMode ? "#334155" : "#e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}
                  labelStyle={{ color: darkMode ? "#facc15" : "#1e293b", fontWeight: 600 }}
                />
                <Bar dataKey="OutboundCalls" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="OutboundCalls" position="top" style={labelStyle} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {noAnswerData.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-icon">📵</span>
              <h2>No Answers (RONA) by Agent</h2>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={noAnswerData}>
                <XAxis dataKey="Agent" angle={-45} textAnchor="end" interval={0} height={120} tick={{ fill: darkMode ? "#f1f5f9" : "#1f2937", fontSize: 12 }} />
                <YAxis tick={{ fill: darkMode ? "#f1f5f9" : "#1f2937" }}/>
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                    borderColor: darkMode ? "#334155" : "#e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}
                  labelStyle={{ color: darkMode ? "#facc15" : "#1e293b", fontWeight: 600 }}
                />
                <Bar dataKey="NoAnswers" fill="#f97316" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="NoAnswers" position="top" style={labelStyle}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {percentData.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-icon">🕒</span>
              <h2>Percentage Available by Agent</h2>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={percentData} barCategoryGap="2%">
                <XAxis dataKey="Agent" angle={-45} textAnchor="end" interval={0} height={120} tick={{ fill: darkMode ? "#f1f5f9" : "#1f2937", fontSize: 12 }} />
                <YAxis tick={{ fill: darkMode ? "#f1f5f9" : "#1f2937" }}/>
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                    borderColor: darkMode ? "#334155" : "#e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}
                  labelStyle={{ color: darkMode ? "#facc15" : "#1e293b", fontWeight: 600 }}
                  formatter={(value) => `${value.toFixed(2)}%`}
                />
                <Bar dataKey="PercentageAvailable" fill="#10b981" radius={[4, 4, 0, 0]}>
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