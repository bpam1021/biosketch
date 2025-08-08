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
import EnhancedExportButton from "../../components/Presentation/EnhancedExportButton";
import DocumentEditor from "../../components/Presentation/DocumentEditor";
import EnhancedDocumentEditor from "../../components/Presentation/EnhancedDocumentEditor";
import ContentImportPanel from "../../components/Presentation/ContentImportPanel";
import SlideAnimationPanel from "../../components/Presentation/SlideAnimationPanel";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "react-toastify";
import Sidebar from "../../components/Sidebar";
import { FiFileText, FiMonitor, FiSettings, FiImage, FiLayers } from "react-icons/fi";

const PresentationPage = () => {
    const { id } = useParams<{ id: string }>();
    const [presentation, setPresentation] = useState<Presentation | null>(null);
    const [slides, setSlides] = useState<Slide[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSlideIds, setSelectedSlideIds] = useState<number[]>([]);
    const [dragDisabledMap, setDragDisabledMap] = useState<{ [slideId: number]: boolean }>({});
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
    const [showAnimationPanel, setShowAnimationPanel] = useState(false);
    const [showImportPanel, setShowImportPanel] = useState(false);
    const [showSectionView, setShowSectionView] = useState(false);

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

    const handleDocumentContentChange = (content: string) => {
        if (presentation && slides.length > 0) {
            const updatedSlide = { ...slides[0], rich_content: content };
            handleSlideUpdate(updatedSlide);
        }
    };

    const handleDocumentSave = () => {
        toast.success("Document saved successfully!");
    };
    if (loading) return <div className="p-4">Loading...</div>;
    if (!presentation) return <div className="p-4">Presentation not found.</div>;

    const isDocumentType = (presentation as any).presentation_type === 'document';
    return (
        <div className="flex min-h-screen bg-gray-100 overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-6 sm:p-8 max-w-5xl mx-auto bg-white min-h-screen">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            {isDocumentType ? <FiFileText className="text-blue-600" size={20} /> : <FiMonitor className="text-purple-600" size={20} />}
                        </div>
                        <div>
                            <h1 className="text-3xl font-semibold text-gray-800">
                                {presentation.title}
                            </h1>
                            <p className="text-sm text-gray-600">
                                {isDocumentType ? 'Document' : 'Slide Presentation'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {!isDocumentType && (
                            <>
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button
                                        onClick={() => setViewMode('edit')}
                                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                            viewMode === 'edit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                                        }`}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => setViewMode('preview')}
                                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                            viewMode === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                                        }`}
                                    >
                                        Preview
                                    </button>
                                </div>
                                <button
                                    onClick={() => setShowAnimationPanel(!showAnimationPanel)}
                                    className="flex items-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors"
                                >
                                    <FiSettings size={16} />
                                    Animations
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setShowImportPanel(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors"
                        >
                            <FiImage size={16} />
                            Import
                        </button>
                        {isDocumentType && (
                            <button
                                onClick={() => setShowSectionView(!showSectionView)}
                                className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
                            >
                                <FiLayers size={16} />
                                Sections
                            </button>
                        )}
                        <EnhancedExportButton
                        presentationId={presentation.id}
                        selectedSlideIds={selectedSlideIds}
                        presentationType={isDocumentType ? 'document' : 'slides'}
                        slideCount={slides.length}
                    />
                    </div>
                </div>

                {isDocumentType ? (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <EnhancedDocumentEditor
                            content={slides[0]?.rich_content || slides[0]?.description || ''}
                            onContentChange={handleDocumentContentChange}
                            onSave={handleDocumentSave}
                            presentationId={presentation.id}
                        />
                    </div>
                ) : (
                    <>
                        {showAnimationPanel && (
                            <div className="mb-6">
                                <SlideAnimationPanel
                                    animations={slides[0]?.animations || []}
                                    onAnimationsChange={(animations) => {
                                        if (slides.length > 0) {
                                            const updatedSlide = { ...slides[0], animations };
                                            handleSlideUpdate(updatedSlide);
                                        }
                                    }}
                                    onPreview={() => {
                                        toast.info("Playing animation preview...");
                                    }}
                                />
                            </div>
                        )}

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
                    </>
                )}

                {/* Import Panel Modal */}
                {showImportPanel && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-900">Import Content</h2>
                                <button
                                    onClick={() => setShowImportPanel(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[70vh]">
                                <ContentImportPanel
                                    presentationId={presentation.id}
                                    onContentImported={(importedContent) => {
                                        // Refresh presentation data
                                        window.location.reload(); // Simple refresh for now
                                        setShowImportPanel(false);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PresentationPage;