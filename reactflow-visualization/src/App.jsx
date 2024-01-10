// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useCallback } from "react";
import ReactFlow, {
  Background
} from "reactflow";
import ELK from "elkjs";
import { shallow } from 'zustand/shallow';

import "reactflow/dist/style.css";

import CCGNode from "./components/CCGNode/CCGNode.jsx";
import "./components/CCGNode/ccg-node.css";

import useStore from './store.js';

const selector = (state) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
});

const nodeTypes = { ccg: CCGNode };
const NODE_WIDTH = 150;
const NODE_HEIGHT = 75;

export default function App() {
  const { nodes, edges, onNodesChange, onEdgesChange } = useStore(selector, shallow);

  const setNodes = useStore((state) => state.setNodes);
  const setEdges = useStore((state) => state.setEdges);
  const setMarkedNodes = useStore((state) => state.setMarkedNodes);

  const elk = new ELK({
    defaultLayoutOptions: {
      algorithm: "mrtree",
      "elk.direction": "DOWN",
      "spacing.nodeNode": "15",
    },
  });

  // eslint-disable-next-line no-undef
  let rootNode = convertToCCGNodes(astNodes);
  let elkNodes = convertToELKNode(rootNode, 0);
  let elkEdges = extractELKEdges(elkNodes);
  elkNodes = unpackNodes(elkNodes);

  // eslint-disable-next-line no-undef
  setMarkedNodes(markedCCGNodes);

  const layoutGraph = async () => {
    const layoutedGraph = await elk
      .layout({
        id: "root",
        children: elkNodes,
        edges: elkEdges,
      })
      .catch((err) => console.log(err));

    const convertedChildren = convertToReactflowNode(layoutedGraph.children);
    setNodes(convertedChildren);
    setEdges(convertToReactflowEdges(layoutedGraph.edges));
  };

  useEffect(() => {
    layoutGraph();
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        edges={edges}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
      >
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

function convertToCCGNodes(node) {
  if (node) {
    return {
      ruleName: node.ruleName,
      id: node.id,
      bottomUpId: node.bottomUpId,
      content: node.content,
      children: node.children.flatMap((child) => convertToCCGNodes(child)),
    };
  } else {
    return [];
  }
}

function convertToELKNode(node, id) {
  if (node) {
    let childId = 0;
    return {
      id: `${id}`,
      ruleName: node.ruleName,
      ccgId: node.id,
      content: node.content,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      isLeaf: !node.children || (node.children && node.children.length == 0),
      children: node.children.flatMap((child) =>
        convertToELKNode(child, `${id}-${childId++}`)
      ),
    };
  } else {
    return [];
  }
}

function extractELKEdges(node) {
  if (node && node.children) {
    let edges = [];
    node.children.forEach((child) => {
      edges.push({
        id: `e${node.id}-${child.id}`,
        type: 'bezier',
        sources: [node.id],
        targets: [child.id],
      });
    });
    return edges.concat(
      node.children.flatMap((child) => extractELKEdges(child))
    );
  } else {
    return [];
  }
}

function convertToReactflowNode(nodes) {
  const result = [];
  for (const node of nodes) {
    result.push({
      id: node.id,
      type: "ccg",
      position: { x: node.x, y: node.y },
      draggable: false,
      data: {
        ccgData: {
          id: node.ccgId,
          ruleName: node.ruleName,
          isLeaf: node.isLeaf,
          content: node.content
        },
      },
    });
  }
  return result;
}

function convertToReactflowEdges(edges) {
  return edges.flatMap((edge) => {
    return {
      id: edge.id,
      type: 'straight',
      source: edge.sources[0],
      target: edge.targets[0],
    };
  });
}

function unpackNodes(node) {
  if (node.children) {
    const children = node.children.flatMap((child) => unpackNodes(child));
    node.children = [];
    return [node].concat(children);
  } else {
    return [node];
  }
}
