import { useState } from "react";
import { FiThumbsUp } from "react-icons/fi";
import { toggleUpvote } from "../../api/communityApi";

interface ImageDetailProps {
    image: {
        id: number;
        image_url: string;
        image_name: string;
        image_title: string;
        image_size: string;
        image_type: string;
        categories: string;
        user_description: string;
        prompt: string;
        upvotes: number;
        created_at: string;
        user: { username: string };
    };
}

const ImageDetail: React.FC<ImageDetailProps> = ({ image }) => {
    const [upvotes, setUpvotes] = useState<number>(Number(image.upvotes) || 0);
    const [, setHasUpvoted] = useState<boolean>(false);
    const handleUpvote = async () => {
        try {
            const res = await toggleUpvote(image.id.toString());
            if (res?.data?.upvotes !== undefined) {
                setUpvotes(res.data.upvotes);
            }
    
            if (res?.data?.status === "liked") {
                setHasUpvoted(true);
            } else if (res?.data?.status === "unliked") {
                setHasUpvoted(false);
            }
        } catch (err) {
            console.error("Failed to upvote:", err);
        }
    };

    return (
        <div className="mb-8 p-4 bg-white rounded-2xl shadow-lg">
            <img
                src={image.image_url}
                alt={image.image_name}
                className="w-full h-auto object-cover rounded-xl shadow-md mb-5 transition-transform duration-300 hover:scale-[1.02]"
            />

            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-gray-800">
                        {image.image_title}
                    </h2>
                    <p className="text-gray-600 text-sm">
                        <span className="font-medium text-gray-700">Prompt:</span> {image.prompt}
                    </p>
                    <p className="text-gray-600 text-sm">
                        <span className="font-medium text-gray-700">Description:</span> {image.user_description}
                    </p>
                    <p className="text-gray-600 text-sm">
                        <span className="font-medium text-gray-700">Categories:</span> {image.categories}
                    </p>
                    <p className="text-xs text-gray-500 italic">
                        Uploaded by {image.user.username} on{" "}
                        {new Date(image.created_at).toLocaleString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                        })}
                    </p>
                </div>

                <button
                    onClick={handleUpvote}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 active:scale-95 shadow-sm"
                >
                    <FiThumbsUp className="text-lg" /> {upvotes}
                </button>
            </div>
        </div>
    );
};

export default ImageDetail;
