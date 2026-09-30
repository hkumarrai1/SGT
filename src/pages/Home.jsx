import Background from "../components/Background/Background";
import Finale from "../components/Finale/Finale";
import Hero from "../components/Hero/Hero";
import HowSGT from "../components/HowSGT/HowSGT";
import Navbar from "../components/Navbar/Navbar";
import Safety from "../components/Safety/Safety";
import Working from "../components/Working/Working";

function Home() {
  return (
    <main className="home-page">
      <Background />
      <Navbar />
      <Hero />
      <HowSGT />
      <Working />
      <Safety />
      <Finale />
    </main>
  );
}

export default Home;
