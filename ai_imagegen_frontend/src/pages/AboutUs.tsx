import "./about.css";

const AboutUsPage = () => {
    return (
        <div className="relative w-full  overflow-hidden text-white font-sans">
            {/* 🎥 Background video */}
            <video
                className="fixed top-0 left-0 w-full h-full object-cover z-0"
                autoPlay
                loop
                muted
                playsInline
            >
                <source src="/background-video.webm" type="video/webm" />
                Your browser does not support the video tag.
            </video>

            {/* 📌 Fixed title */}
            <div className="fixed top-1/2 left-8 transform -translate-y-1/2 z-10">
                <div className="text-4xl font-extrabold text-white text-left leading-tight">
                    Biosketch AI<br />Community Library
                </div>
            </div>

            {/* 🎞️ Scrolling content */}
            <div className="absolute bottom-0 w-full z-10 overflow-hidden pointer-events-none">
                <div className="credits-scroll max-w-2xl mx-auto text-center px-4 text-white text-lg leading-relaxed space-y-10">
                    <section>
                        <div className="text-2xl font-semibold">Our Philosophy</div>
                        <p>
                            At Biosketch AI, we believe science should be visual, collaborative, and freely shared.
                            That’s why:<br />
                            All AI-generated community images are free to use, remix, and download<br />
                            Anyone can contribute — let’s build the world’s most open scientific image library
                        </p>
                    </section>

                    <section>
                        <div className="text-2xl font-semibold">🤝 How It Works</div>
                        <p>
                            🖼️ Generate an image<br />
                            📤 Upload it to the community gallery<br />
                            🔓 Everyone can browse, download, and use it — no subscriptions, no restrictions<br />
                            🙌 Credit is optional, community spirit is essential
                        </p>
                    </section>

                    <section>
                        <div className="text-2xl font-semibold">💸 How We Sustain It</div>
                        <p>
                            Biosketch AI is free to use — and always will be for:<br />
                            Generating and sharing community images<br />
                            Browsing the open-access image library<br /><br />
                            We charge only a small fee for:<br />
                            API-generated images using advanced models<br />
                            To help maintain and host the site (not to limit access)
                        </p>
                    </section>

                    <section>
                        <h3 className="text-xl mt-4 font-semibold italic">🧾 There are no subscriptions for community content. Ever.</h3>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AboutUsPage;