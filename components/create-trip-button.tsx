"use client";

export function CreateTripButton() {
  return (
    <button className="primary-button" type="button" onClick={() => undefined}>
      <span aria-hidden="true">+</span>
      Create your first trip
    </button>
  );
}
