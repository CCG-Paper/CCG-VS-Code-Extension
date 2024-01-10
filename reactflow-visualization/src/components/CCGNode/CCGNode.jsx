/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { shallow } from 'zustand/shallow';
import useStore from '../../store.js';

const selector = (state) => ({
  markedNodes: state.markedNodes
});

function CCGNode({ id, data }) {
  const { markedNodes } = useStore(selector, shallow);
  for (const markedNode in markedNodes) {
    if(markedNode === data.ccgData.id) {
      data.selection = markedNodes[markedNode];
      break;
    }
  }

  const changeSelection = useStore((state) => state.changeSelection);

  return (
    // eslint-disable-next-line no-undef
    <div className={"ccg-node" + (data?.ccgData?.isLeaf ? " is-leaf" : "")} onClick={() => vscode.postMessage({command: 'addMarking', id: data?.ccgData.id})} data-selection={data?.selection ?? 'none'}>
      <Handle type="target" position={Position.Top} />
      <div>
        <span className='rule-name'>{data?.ccgData ? data.ccgData.ruleName : ''}</span>
        {data?.ccgData && data.ccgData.id ? <span className='id-name'>{data.ccgData.id.substring(0,7)}</span> : <span>No ID</span>}
        {<span>{data?.ccgData ? data.ccgData.content : ''}</span>}
      </div>
      {data?.ccgData?.isLeaf ? '' : <Handle type="source" position={Position.Bottom} /> }
    </div>
  );
}

export default CCGNode;
