import React from "react";
import ReactMarkdown from "react-markdown";

function Feedback({ feedback }) {
  return (
    <div>
      <h2 className="h5">AI Feedback</h2>
      <div className="mt-2">
        <ReactMarkdown>
          {feedback}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export default Feedback;
