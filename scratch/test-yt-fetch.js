import { YoutubeTranscript } from 'youtube-transcript';

async function testFetch(videoId) {
  console.log(`Fetching transcript for ${videoId}...`);
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    console.log(`Success! Fetched ${items.length} items.`);
    console.log("Sample of first 10 items:");
    console.log(items.slice(0, 10));
  } catch (err) {
    console.error("Error fetching transcript:", err);
  }
}

testFetch("e7sAf4SbS_g");
