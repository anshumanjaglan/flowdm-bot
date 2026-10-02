"use client"
import React, { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  { id: '1', position: { x: 250, y: 50 }, data: { label: 'Comment Trigger: "GUIDE"' }, type: 'input' },
  { id: '2', position: { x: 250, y: 150 }, data: { label: 'Public Reply: "Check your DMs!"' } },
  { id: '3', position: { x: 250, y: 250 }, data: { label: 'DM: "Here is the guide link..."' }, type: 'output' },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
];

export default function BuilderPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className="w-full h-[calc(100vh-4rem)] flex flex-col">
      <div className="h-14 border-b flex items-center px-4 justify-between bg-white">
        <h1 className="font-semibold">Visual Flow Builder</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium">
          Publish Flow
        </button>
      </div>
      <div className="flex-1 w-full bg-slate-50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
