"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const axios_1 = __importDefault(require("axios"));
// interface Engagement {
//   chat: string
// }
function getZoomAccessToken(accountId, clientId, clientSecret) {
    return __awaiter(this, void 0, void 0, function* () {
        const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;
        const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        try {
            const response = yield axios_1.default.post(tokenUrl, null, {
                headers: {
                    Authorization: `Basic ${authHeader}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            const bearerToken = response.data.access_token;
            return bearerToken;
        }
        catch (error) {
            console.error('Error obtaining Zoom access token:', error);
            throw new Error('Failed to obtain Zoom access token');
        }
    });
}
function getPastMeetingParticipants(baseUrl, meetingId, bearerToken) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const url = `${baseUrl}/past_meetings/${meetingId}/participants`;
            const response = yield axios_1.default.get(url, {
                headers: {
                    Authorization: `Bearer ${bearerToken}`,
                    'Content-Type': 'application/json',
                },
            });
            return {
                data: response.data,
                status: response.status,
                statusText: response.statusText,
            };
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw new Error(((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error.message);
            }
            else {
                throw new Error('An unknown error occurred');
            }
        }
    });
}
function getMeetingPollsQuestions(baseUrl, meetingId, bearerToken) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const url = `${baseUrl}/meetings/${meetingId}/polls`;
            const response = yield axios_1.default.get(url, {
                headers: {
                    Authorization: `Bearer ${bearerToken}`,
                    'Content-Type': 'application/json',
                },
            });
            return {
                data: response.data,
                status: response.status,
                statusText: response.statusText,
            };
        }
        catch (error) {
            throw new Error(((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error.message);
        }
    });
}
function getPastMeetingPolls(baseUrl, meetingId, bearerToken) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const url = `${baseUrl}/past_meetings/${meetingId}/polls`;
            const response = yield axios_1.default.get(url, {
                headers: {
                    Authorization: `Bearer ${bearerToken}`,
                },
            });
            return {
                data: response.data,
                status: response.status,
                statusText: response.statusText,
            };
        }
        catch (error) {
            throw new Error(((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error.message);
        }
    });
}
function processParticipantsAndPollsData(participants, pollScores, emailMappings) {
    const participantMap = new Map();
    // Process participants to calculate total time and map email and LTId
    participants.forEach(participant => {
        const name = participant.name;
        const joinTime = new Date(participant.join_time).getTime();
        const leaveTime = new Date(participant.leave_time).getTime();
        const duration = (leaveTime - joinTime) / 1000; // Convert to seconds
        const mappingData = emailMappings[name] || { Email: participant.user_email || 'NaN', LTId: 'NaN' };
        if (participantMap.has(name)) {
            participantMap.get(name).totalTime += duration;
        }
        else {
            participantMap.set(name, {
                totalTime: duration,
                joinTime: joinTime,
                leaveTime: leaveTime,
                email: mappingData.Email,
                LTId: mappingData.LTId,
                pollAnswers: []
            });
        }
    });
    // Process poll scores and connect them with participant data
    pollScores.forEach(person => {
        const participantData = participantMap.get(person.name);
        if (participantData) {
            participantData.pollAnswers.push(person);
        }
    });
    return participantMap;
}
function saveProcessedDataToFile(data, meetingId) {
    const processedData = {
        meetingId: meetingId,
        attendees: Array.from(data.entries()).map(([name, participantData]) => ({
            name,
            totalTime: participantData.totalTime,
            joinTime: participantData.joinTime,
            leaveTime: participantData.leaveTime,
            email: participantData.email,
            LTId: participantData.LTId,
            pollAnswers: participantData.pollAnswers.map(answer => ({
                total_score: answer.total_score,
                attempted: answer.attempted,
                total_questions: answer.total_questions,
            }))
        }))
    };
    return processedData;
}
// POLLS ANSWER CALCULATION 
function calculateScore(pollsQuestionsResponse, pollsAnswers) {
    // Initialize a participantScores array
    const participantScores = [];
    // Iterate over participants in pollAnswers
    pollsAnswers.questions.forEach((participant) => {
        const participantScore = {
            name: participant.name,
            total_score: 0,
            total_questions: 0,
            attempted: 0
        };
        // Iterate over the participant's answers
        participant.question_details.forEach((responseDetail) => {
            const pollQuestion = pollsQuestionsResponse.polls.find(poll => poll.id === responseDetail.polling_id);
            if (pollQuestion) {
                const question = pollQuestion.questions.find(q => q.name == responseDetail.question);
                const scoreObj = {
                    title: pollQuestion.title,
                    question: (question === null || question === void 0 ? void 0 : question.name) || 'Default',
                    score: 0
                };
                if (question) {
                    participantScore.attempted++; // Increment attempted for every question
                    if (!question.right_answers) {
                        // Case 1: If no answer is required, increment score and total
                        scoreObj.score++;
                        participantScore.total_score++;
                    }
                    else {
                        // Case 2: If an answer exists, compare it with the right answer
                        if (question.right_answers.includes(responseDetail.answer)) {
                            scoreObj.score++; // Increment score if the answer is correct
                            participantScore.total_score++; // Increment total score
                        }
                    }
                }
                participantScore.total_questions = participantScore.attempted;
            }
        });
        // Push the calculated participant score to the array
        participantScores.push(participantScore);
    });
    // Return the participantScores array
    return participantScores;
}
function run(accountId, clientId, clientSecret, emailMappings, meetingId) {
    return __awaiter(this, void 0, void 0, function* () {
        const baseUrl = "https://api.zoom.us/v2";
        // const meetingId = "82339006452";
        // const emailMappingsPath = path.join(__dirname, 'downloads', 'mails.json');
        try {
            // Step 0 : Call Zoom Oauth for Access Token
            console.log("Fetching access token with account credentials...");
            const bearerToken = yield getZoomAccessToken(accountId, clientId, clientSecret);
            console.log("Access Token fetched successfully");
            // Step 1: Call the Zoom API for participants
            console.log("Fetching participant data from Zoom API...");
            const participantsResponse = yield getPastMeetingParticipants(baseUrl, meetingId, bearerToken);
            console.log("Participants data fetched successfully");
            // Step 2: call the Zoom API for polls answers
            const pollsQuestionResponse = yield getMeetingPollsQuestions(baseUrl, meetingId, bearerToken);
            console.log('Poll Questions fetched successfully');
            // Step 2.5: Call the Zoom API for polls
            console.log("\nFetching poll data from Zoom API...");
            const pollsResponse = yield getPastMeetingPolls(baseUrl, meetingId, bearerToken);
            console.log("Poll data fetched successfully");
            // Step 3: Read email mappings
            console.log("\nReading email mappings from file...");
            // Step 5: Processing the Scores:
            console.log("\nCalculating Scores...");
            const scores = calculateScore(pollsQuestionResponse.data, pollsResponse.data);
            // Step 6: Process and combine the data
            console.log("\nProcessing and combining participant and poll data with email mappings...");
            const participantMap = yield processParticipantsAndPollsData(participantsResponse.data.participants, scores, JSON.parse(emailMappings));
            const processedData = yield saveProcessedDataToFile(participantMap, meetingId);
            // Step 7: Output processedData
            return processedData;
        }
        catch (error) {
            console.error('Error:', error);
        }
    });
}
