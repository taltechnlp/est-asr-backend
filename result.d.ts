type SectionType = "non-speech" | "speech";
type Speakers = {
    [index: string]: { name?: string };
};
type Word = {
    confidence: number;
    start: number;
    end: number;
    punctuation: number;
    word: string;
    word_with_punctuation: string;
    unnormalized_words?: [
        {
            confidence: number;
            end: number;
            word_with_punctuation: string;
            punctuation: string;
            start: number;
            word: string;
        }
    ];
};
type Turn = {
    start: number;
    end: number;
    speaker: string;
    transcript: string;
    unnormalized_transcript: string;
    words?: [Word];
};
type EditorContent = {
    speakers: Speakers;
    sections: [
        {
            start: number;
            end: number;
            type: SectionType;
            turns?: [Turn];
        }
    ];
};
