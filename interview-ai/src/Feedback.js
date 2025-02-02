import React from "react";

function Feedback({ feedback }) {
  return (
    <div>
      <h2 className="h5">AI Feedback</h2>
      <p>{feedback}</p>
    </div>
  );
}

export default Feedback;
