import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
    getPresentation,
    updateSlide,
    deleteSlide,
    duplicateSlide,
    reorderSlides,
} from "../../api/presentationApi";
import { Presentation, Slide } from "../../types/Presentation";
import SlideCard from "../../components/Presentation/SlideCard";
import ExportButton from "../../components/Presentation/ExportButton";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "react-toastify";
import Sidebar from "../../components/Sidebar";

const PresentationPage = () => {
    const { id } = useParams<{ id: string }>();
    const [presentation, setPresentation] = useState<Presentation | null>(null);
    const [slides, setSlides] = useState<Slide[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSlideIds, setSelectedSlideIds] = useState<number[]>([]);
    const [dragDisabledMap, setDragDisabledMap] = useState<{ [slideId: number]: boolean }>({});

    useEffect(() => {
        const presentationId = Number(id);
        if (isNaN(presentationId)) {
            toast.error("Invalid presentation ID.");
            setLoading(false);
            return;
        }

        const loadPresentation = async () => {
            try {
                const data = await getPresentation(presentationId);
                setPresentation(data);
                setSlides(data.slides);
            } catch (err) {
                toast.error("Failed to load presentation.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadPresentation();
    }, [id]);

    const toggleSlideSelection = (id: number) => {
        setSelectedSlideIds((prev) =>
            prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
        );
    };

    const handleSlideUpdate = async (updatedSlide: Slide) => {
        try {
            const updated = await updateSlide(updatedSlide.id, updatedSlide);
            setSlides((prev) =>
                prev.map((s) => (s.id === updated.id ? updated : s))
            );
        } catch (err) {
            toast.error("Failed to update slide.");
        }
    };

    const handleSlideDelete = async (slideId: number) => {
        try {
            await deleteSlide(slideId);
            setSlides((prev) => prev.filter((s) => s.id !== slideId));
        } catch (err) {
            toast.error("Failed to delete slide.");
        }
    };

    const handleSlideDuplicate = async (slide: Slide) => {
        try {
            const newSlide = await duplicateSlide(slide.id);
            setSlides((prev) => [...prev, newSlide]);
        } catch (err) {
            toast.error("Failed to duplicate slide.");
        }
    };

    const handleDragEnd = async (result: any) => {
        if (!result.destination) return;

        const reordered = Array.from(slides);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);

        setSlides(reordered);
        try {
            await reorderSlides(Number(id), reordered.map((s) => s.id));
        } catch (err) {
            toast.error("Failed to reorder slides.");
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;
    if (!presentation) return <div className="p-4">Presentation not found.</div>;

    return (
        <div className="flex min-h-screen bg-gray-100 overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-6 sm:p-8 max-w-5xl mx-auto bg-white min-h-screen">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h1 className="text-3xl font-semibold text-gray-800">
                        {presentation.title}
                    </h1>
                    <ExportButton
                        presentationId={presentation.id}
                        selectedSlideIds={selectedSlideIds}
                    />
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
                                        draggableId={slide.id.toString()}
                                        index={index}
                                        isDragDisabled={!!dragDisabledMap[slide.id]}
                                    >
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps} // only container
                                                className={`transition-transform duration-200 rounded-lg shadow-md p-4 bg-gray-50 hover:bg-white ${snapshot.isDragging ? "ring-2 ring-blue-400 scale-105" : ""}`}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSlideIds.includes(slide.id)}
                                                        onChange={() => toggleSlideSelection(slide.id)}
                                                        className="mt-2"
                                                    />
                                                    <SlideCard
                                                        slide={slide}
                                                        onUpdate={handleSlideUpdate}
                                                        onDelete={handleSlideDelete}
                                                        onDuplicate={handleSlideDuplicate}
                                                        disableDrag={!!dragDisabledMap[slide.id]}
                                                        onDragStateChange={(isEditing) =>
                                                            setDragDisabledMap((prev) => ({ ...prev, [slide.id]: isEditing }))
                                                        }
                                                        dragHandleProps={provided.dragHandleProps ?? undefined} // ✅ only drag icon
                                                    />
                                                </div>
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
        </div>
    );
};

export default PresentationPage;