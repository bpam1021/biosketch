import axios from "./axiosClient";

export const magicSegment = async (file: File) => {
  const formData = new FormData();
  formData.append("image", file);

  const response = await axios.post("/users/magic-segment/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};
