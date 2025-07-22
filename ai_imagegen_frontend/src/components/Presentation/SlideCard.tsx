import React, { useState, useEffect } from "react";
import { Slide } from "../../types/Presentation";
import SlideToolbar from "./SlideToolbar";
import SlideCanvasEditor from "./SlideCanvasEditor";
import { updateSlide } from "../../api/presentationApi";
import { toast } from "react-toastify";

interface SlideCardProps {
    slide: Slide;
    onUpdate: (updated: Slide) => void;
    onDelete: (id: number) => void;
    onDuplicate: (newSlide: Slide) => void;
    disableDrag?: boolean;
    onDragStateChange?: (isEditing: boolean) => void;
    dragHandleProps?: React.HTMLAttributes<any>;
}

const SlideCard: React.FC<SlideCardProps> = ({
    slide,
    onUpdate,
    onDelete,
    onDuplicate,
    dragHandleProps,
}) => {
    const [title, setTitle] = useState(slide.title);
    const [description, setDescription] = useState(slide.description);
    const [, setDisableDrag] = useState(false);

    useEffect(() => {
        setTitle(slide.title);
        setDescription(slide.description);
    }, [slide.title, slide.description]);

    const handleCanvasSave = async (canvasJSON: string, dataUrl: string) => {
        try {
            const updated = await updateSlide(slide.id, {
                canvas_json: canvasJSON,
                data_url: dataUrl,
            });
            onUpdate(updated);
            toast.success("Canvas saved successfully!");
        } catch (err) {
            toast.error("Failed to save canvas.");
        }
    };

    const handleMetadataSave = () => {
        if (title !== slide.title || description !== slide.description) {
            onUpdate({ ...slide, title, description });
        }
    };

    return (
        <div className="flex flex-col gap-4 border border-gray-200 rounded-xl p-5 bg-gray-50 transition-shadow hover:shadow-md">
            <div className="flex justify-between items-center mb-2">
                <div {...dragHandleProps} className="cursor-grab p-1 rounded hover:bg-gray-200" title="Drag to reorder">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01" />
                    </svg>
                </div>
            </div>
            {/* Title & Description Section */}
            <div className="flex flex-col gap-3">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleMetadataSave}
                    placeholder="Slide title"
                    className="text-2xl font-semibold border-b border-transparent focus:border-blue-400 focus:outline-none bg-transparent transition-colors"
                />
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleMetadataSave}
                    placeholder="Slide description..."
                    rows={3}
                    className="w-full text-sm border rounded-md p-2 bg-white focus:ring-2 focus:ring-blue-300 focus:outline-none transition"
                />
            </div>
            {/* Toolbar Actions */}
            <SlideToolbar
                slide={{ ...slide, title, description, canvas_json: slide.canvas_json }}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
            />
            {/* Canvas Editor */}
            <div className="rounded overflow-hidden border border-gray-300 bg-white">
                <SlideCanvasEditor
                    slide={slide}
                    onCanvasSave={handleCanvasSave}
                    onInteractionChange={(isEditing) => setDisableDrag(isEditing)}
                />
            </div>


        </div>
    );
};

export default SlideCard;
