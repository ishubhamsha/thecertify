import { YoutubeTranscript } from "youtube-transcript";

async function run() {
  try {
    const items = await YoutubeTranscript.fetchTranscript("dQw4w9WgXcQ"); // Rick Astley
    console.log("Segment 0:", items[0]);
    console.log("Segment 1:", items[1]);
  } catch (e) {
    console.error(e);
  }
}
run();
