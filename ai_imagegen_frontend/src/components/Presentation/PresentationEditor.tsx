import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult} from "@hello-pangea/dnd";
import { toast } from "react-toastify";
import { Slide, Presentation } from "../../types/Presentation";
import SlideCard from "./SlideCard";
import { reorderSlides } from "../../api/presentationApi";

interface Props {
  presentation: Presentation;
}

const PresentationEditor: React.FC<Props> = ({ presentation }) => {
  const [slides, setSlides] = useState<Slide[]>([...presentation.slides]);
  const [savingOrder, setSavingOrder] = useState(false);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const newSlides = [...slides];
    const [moved] = newSlides.splice(result.source.index, 1);
    newSlides.splice(result.destination.index, 0, moved);

    const reordered = newSlides.map((slide, i) => ({ ...slide, order: i }));
    setSlides(reordered);

    try {
      setSavingOrder(true);
      await reorderSlides(presentation.id, reordered.map((s) => s.id));
      toast.success("Slides reordered");
    } catch (err) {
      toast.error("Failed to reorder slides");
    } finally {
      setSavingOrder(false);
    }
  };

  const updateSlideInState = (updated: Slide) => {
    setSlides((prev) =>
      prev.map((slide) =>
        slide.id === updated.id ? { ...slide, ...updated } : slide
      )
    );
  };

  const removeSlideFromState = (id: number) => {
    setSlides((prev) => prev.filter((s) => s.id !== id));
  };

  const addSlideToState = (newSlide: Slide) => {
    setSlides((prev) => [...prev, newSlide]);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold text-gray-800">{presentation.title}</h1>
        {savingOrder && (
          <span className="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full animate-pulse">
            Saving order...
          </span>
        )}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="slide-list">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-6"
            >
              {slides.map((slide, index) => (
                <Draggable
                  key={slide.id}
                  draggableId={String(slide.id)}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`bg-white p-5 rounded-xl shadow-sm border hover:shadow-md transition-shadow duration-200 ${
                        snapshot.isDragging ? "ring-2 ring-blue-400" : ""
                      }`}
                    >
                      <SlideCard
                        slide={slide}
                        onUpdate={updateSlideInState}
                        onDelete={removeSlideFromState}
                        onDuplicate={addSlideToState}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default PresentationEditor;
