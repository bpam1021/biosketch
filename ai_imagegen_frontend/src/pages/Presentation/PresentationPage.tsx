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
import DocumentEditor from "../../components/Presentation/DocumentEditor";
import AdvancedSlideEditor from "../../components/Presentation/AdvancedSlideEditor";
import ExportButton from "../../components/Presentation/ExportButton";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "react-toastify";
import Sidebar from "../../components/Sidebar";
import { FiFileText, FiMonitor, FiEdit3, FiEye } from "react-icons/fi";

const PresentationPage = () => {
    const { id } = useParams<{ id: string }>();
    const [presentation, setPresentation] = useState<Presentation | null>(null);
    const [slides, setSlides] = useState<Slide[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSlideIds, setSelectedSlideIds] = useState<number[]>([]);
    const [dragDisabledMap, setDragDisabledMap] = useState<{ [slideId: number]: boolean }>({});
    const [editMode, setEditMode] = useState<'simple' | 'advanced'>('simple');
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

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

    const handleVideoExport = async (settings: any) => {
        try {
            toast.info('Starting video export...');
            // Call your video export API here
            await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate export
            toast.success('Video exported successfully!');
        } catch (error) {
            toast.error('Failed to export video');
        }
    };

    const handleDocumentSave = async () => {
        try {
            // Save document changes
            toast.success('Document saved successfully!');
        } catch (error) {
            toast.error('Failed to save document');
        }
    };

    if (loading) return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar />
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading presentation...</p>
                </div>
            </div>
        </div>
    );

    if (!presentation) return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar />
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Presentation not found.</p>
                </div>
            </div>
        </div>
    );

    // Document Type Rendering
    if (presentation.presentation_type === 'document') {
        return (
            <div className="flex min-h-screen bg-gray-100">
                <Sidebar />
                <div className="flex-1">
                    <div className="bg-white border-b border-gray-200 p-4">
                        <div className="max-w-5xl mx-auto flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FiFileText className="text-blue-600" size={24} />
                                <div>
                                    <h1 className="text-xl font-semibold text-gray-900">{presentation.title}</h1>
                                    <p className="text-sm text-gray-600">Document • {presentation.document?.sections?.length || 0} sections</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    <FiEye size={16} />
                                    {viewMode === 'edit' ? 'Preview' : 'Edit'}
                                </button>
                                <ExportButton
                                    presentationId={presentation.id}
                                    selectedSlideIds={selectedSlideIds}
                                />
                            </div>
                        </div>
                    </div>

                    {presentation.document && (
                        <DocumentEditor
                            document={presentation.document}
                            onUpdate={(updatedDoc) => 
                                setPresentation(prev => prev ? { ...prev, document: updatedDoc } : null)
                            }
                            onSave={handleDocumentSave}
                        />
                    )}
                </div>
            </div>
        );
    }

    // Slide Type Rendering
    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar />
            <div className="flex-1">
                <div className="bg-white border-b border-gray-200 p-4">
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FiMonitor className="text-purple-600" size={24} />
                            <div>
                                <h1 className="text-xl font-semibold text-gray-900">{presentation.title}</h1>
                                <p className="text-sm text-gray-600">Slide Deck • {slides.length} slides</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="flex bg-gray-100 rounded-lg p-1">
                                <button
                                    onClick={() => setEditMode('simple')}
                                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                        editMode === 'simple' 
                                            ? 'bg-white text-gray-900 shadow-sm' 
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    Simple
                                </button>
                                <button
                                    onClick={() => setEditMode('advanced')}
                                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                        editMode === 'advanced' 
                                            ? 'bg-white text-gray-900 shadow-sm' 
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    Advanced
                                </button>
                            </div>
                            
                            <ExportButton
                                presentationId={presentation.id}
                                selectedSlideIds={selectedSlideIds}
                            />
                        </div>
                    </div>
                </div>

                {editMode === 'advanced' ? (
                    <AdvancedSlideEditor
                        slides={slides}
                        onSlidesUpdate={setSlides}
                        onExportVideo={handleVideoExport}
                    />
                ) : (
                    <div className="p-6 sm:p-8 max-w-5xl mx-auto bg-white min-h-screen">
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
                                                        {...provided.draggableProps}
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
                                                                dragHandleProps={provided.dragHandleProps ?? undefined}
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
                )}
            </div>
        </div>
    );
};

export default PresentationPage;