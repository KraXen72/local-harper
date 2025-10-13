import { Component } from 'solid-js';
import type { TopBarProps } from '../types';

const TopBar: Component<TopBarProps> = (props) => {
  return (
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-gray-700">
          Issues: 
        </span>
        <span class="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 rounded-full bg-red-100 text-red-800 text-sm font-semibold">
          {props.issueCount}
        </span>
      </div>
      
      <button
        onClick={props.onCopy}
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Copy Text
      </button>
    </div>
  );
};

export default TopBar;
