import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';

// this is our useStore hook that we can use in our components to get parts of the store and call actions
const useStore = create((set, get) => ({
  nodes: [],
  edges: [],
  markedNodes: [],
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  setNodes: (nodes) => {
    set({
        nodes: nodes
    });
  },
  setEdges: (edges) => {
    set({
        edges: edges
    });
  },
  setMarkedNodes: (markedNodes) => {
    set({
        markedNodes: markedNodes
    });
  },
  changeSelection: (nodeId) => {
    console.log(nodeId);
    set({
        nodes: get().nodes.map((node) => {
          if (node.id === nodeId) {
            switch (node.data.selection) {
                case 'conditional':
                    node.data = { ...node.data, selection: 'deletion' };
                    break;
                case 'deletion':
                    node.data = { ...node.data, selection: 'repetition' };
                    break;
                case 'repetition':
                    node.data = { ...node.data, selection: 'substitution' };
                    break;
                case 'substitution':
                    node.data = { ...node.data, selection: '' };
                    break;
                default:
                    node.data = { ...node.data, selection: 'conditional' };
                    break;           
            }
          }
          return node;
        }),
      });
  }
}));

export default useStore;
