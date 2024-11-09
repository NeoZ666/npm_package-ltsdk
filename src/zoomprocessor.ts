import axios, { AxiosResponse } from 'axios';

interface ZoomParticipant {
  id: string;
  name: string;
  user_email: string;
  join_time: string;
  leave_time: string;
}

interface ZoomParticipantsResponse {
  participants: ZoomParticipant[];
  page_count: number;
  page_size: number;
  total_records: number;
}

interface ZoomPollsQuestion {
  total_records: number;
  polls: PollQuestions[];
}

interface PollQuestions {
  id: string;
  title: string;
  anonymous: boolean;
  status: string;
  questions: Pollquestion[];
  poll_type: number;
}

interface Pollquestion {
  name: string;
  type: string;
  answer_required: boolean;
  answer_min_character?: number;
  answer_max_character?: number;
  answers?: string[];
  right_answers?: string[];
  prompts?: {
    prompt_question: string;
    prompt_right_answers?: string[];
  }[];
  show_as_dropdown?: boolean;
  rating_min_value?: number;
  rating_max_value?: number;
  rating_min_label?: string;
  rating_max_label?: string;
  case_sensitive?: boolean;
}

interface ZoomPollsResponse {
  id: number;
  uuid: string;
  start_time: string;
  questions: ResponseToQuestion[];
}

interface ResponseToQuestion {
  name: string;
  email: string;
  question_details: ResponseQuestionDetail[];
  first_name: string;
}

interface ResponseQuestionDetail {
  question: string;
  answer: string;
  polling_id: string;
  date_time: string;
}

interface ParticipantScore {
  name: string;
  total_score: number;
  attempted: number;
  total_questions: number;
}

interface Scores {
  title: string;
  question: string;
  score: number;
}

interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
}

interface EmailMap {
  [key: string]: {
    LTId: string;
    Email: string;
  };
}

interface ParticipantData {
  totalTime: number;
  joinTime: number;
  leaveTime: number;
  email: string;
  LTId: string;
  total_score: number;
  attempted: number;
  total_questions: number;
}

async function getZoomAccessToken(
  accountId: string,
  clientId: string,
  clientSecret: string
): Promise<string> {

  const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await axios.post(tokenUrl, null, {
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const bearerToken: string = response.data.access_token;
    return bearerToken;
  } catch (error) {
    console.error('Error obtaining Zoom access token:', error);
    throw new Error('Failed to obtain Zoom access token');
  }
}

async function getPastMeetingParticipants(
  baseUrl: string,
  meetingId: string,
  bearerToken: string
): Promise<ApiResponse<ZoomParticipantsResponse>> {
  try {
    const url = `${baseUrl}/past_meetings/${meetingId}/participants`;
    const response: AxiosResponse<ZoomParticipantsResponse> = await axios.get(url, {
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
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || error.message);
    } else {
      throw new Error('An unknown error occurred');
    }
  }
}

async function getMeetingPollsQuestions(
  baseUrl: string,
  meetingId: string,
  bearerToken: string
): Promise<ApiResponse<ZoomPollsQuestion>> {
  try {
    const url = `${baseUrl}/meetings/${meetingId}/polls`;
    const response: AxiosResponse<ZoomPollsQuestion> = await axios.get(url, {
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
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message);
  }
}

async function getPastMeetingPolls(
  baseUrl: string,
  meetingId: string,
  bearerToken: string
): Promise<ApiResponse<ZoomPollsResponse>> {
  try {
    const url = `${baseUrl}/past_meetings/${meetingId}/polls`;
    const response = await axios.get<ZoomPollsResponse>(url, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message);
  }
}

function processParticipantsAndPollsData(
  participants: ZoomParticipant[],
  pollScores: Map<string, ParticipantData>,
): Map<string, ParticipantData> { 
  const participantMap = new Map<string, ParticipantData>();

  // Process participants to calculate total time and map email and LTId
  participants.forEach(participant => {
    const name = participant.name;
    const joinTime = new Date(participant.join_time).getTime();
    const leaveTime = new Date(participant.leave_time).getTime();
    const duration = (leaveTime - joinTime) / 1000; // Convert to seconds

    const mappingData = { Email: participant.user_email || 'NaN', LTId: 'NaN' };

    if (participantMap.has(name)) {
      participantMap.get(name)!.totalTime += duration;
    } else {
      participantMap.set(name, {
        totalTime: duration,
        joinTime: joinTime,
        leaveTime: leaveTime,
        email: mappingData.Email,
        LTId: mappingData.LTId,
        total_score: 0,
        attempted: 0,
        total_questions: 0,
      });
    }
  });

  // Process poll scores and connect them with participant data
  pollScores.forEach((data, name) => {
    const participantData = participantMap.get(name);
    if (participantData) {
      participantData.total_score = data.total_score;
      participantData.attempted = data.attempted;
      participantData.total_questions = data.total_questions;
    }
  });

  return participantMap;
}

function saveProcessedDataToFile(
  data: Map<string, ParticipantData>,
  meetingId: string,
): any {
  const processedData = {
    meetingId: meetingId,
    attendees: Array.from(data.entries()).map(([name, participantData]) => ({
      name,
      totalTime: participantData.totalTime,
      joinTime: participantData.joinTime,
      leaveTime: participantData.leaveTime,
      email: participantData.email,
      LTId: participantData.LTId,
      total_score: participantData.total_score, // Include total score independently
      attempted: participantData.attempted, // Include attempted independently
      total_questions: participantData.total_questions, // Include total questions independently
    }))
  };

  return processedData;
}

// POLLS ANSWER CALCULATION 

function calculateScore(pollsQuestionsResponse: ZoomPollsQuestion, pollsAnswers: ZoomPollsResponse): Map<string, ParticipantData> {
  const participantMap = new Map<string, ParticipantData>();

  // Iterate over participants in pollAnswers
  pollsAnswers.questions.forEach((participant) => {
    const participantData: ParticipantData = {
      totalTime: 0,
      joinTime: 0,
      leaveTime: 0,
      email: '',
      LTId: '',
      total_score: 0,
      attempted: 0,
      total_questions: 0,
    };

    // Iterate over the participant's answers
    participant.question_details.forEach((responseDetail) => {
      const pollQuestion = pollsQuestionsResponse.polls.find(poll => poll.id === responseDetail.polling_id);

      if (pollQuestion) {
        const question = pollQuestion.questions.find(q => q.name == responseDetail.question);
        const scoreObj: Scores = {
          title: pollQuestion.title,
          question: question?.name || 'Default',
          score: 0
        };

        if (question) {
          participantData.attempted++;  // Increment attempted for every question

          if (!question.right_answers) {
            // Case 1: If no answer is required, increment score and total
            scoreObj.score++;
            participantData.total_score++;
          } else {
            // Case 2: If an answer exists, compare it with the right answer
            if (question.right_answers.includes(responseDetail.answer)) {
              scoreObj.score++;  // Increment score if the answer is correct
              participantData.total_score++;  // Increment total score
            }
          }
        }
        participantData.total_questions = participantData.attempted;
      }
    });

    // Add the participant data to the map
    participantMap.set(participant.name, participantData);
  });

  return participantMap;
}

export async function run(accountId: string, clientId: string, clientSecret: string, meetingId: string) {
  const baseUrl = "https://api.zoom.us/v2";

  try {
    // Step 0 : Call Zoom Oauth for Access Token
    console.log("Fetching access token with account credentials...");
    const bearerToken = await getZoomAccessToken(accountId, clientId, clientSecret)
    console.log("Access Token fetched successfully");
    // Step 1: Call the Zoom API for participants
    console.log("Fetching participant data from Zoom API...");
    const participantsResponse = await getPastMeetingParticipants(baseUrl, meetingId, bearerToken);
    console.log("Participants data fetched successfully");

    // Step 2: call the Zoom API for polls answers
    const pollsQuestionResponse = await getMeetingPollsQuestions(baseUrl, meetingId, bearerToken);
    console.log('Poll Questions fetched successfully');

    // Step 2.5: Call the Zoom API for polls
    console.log("\nFetching poll data from Zoom API...");
    const pollsResponse = await getPastMeetingPolls(baseUrl, meetingId, bearerToken);
    console.log("Poll data fetched successfully");

    // Step 3: Read email mappings
    console.log("\nReading email mappings from file...");

    // Step 5: Processing the Scores:
    console.log("\nCalculating Scores...");
    const scores = calculateScore(pollsQuestionResponse.data, pollsResponse.data);

    // Step 6: Process and combine the data
    console.log("\nProcessing and combining participant and poll data with email mappings...");
    const participantMap = processParticipantsAndPollsData(
      participantsResponse.data.participants,
      scores,
    );

    const processedData = saveProcessedDataToFile(participantMap, meetingId);

    // Step 7: Output processedData
    return processedData;
  } catch (error) {
    console.error('Error:', error);
  }
}