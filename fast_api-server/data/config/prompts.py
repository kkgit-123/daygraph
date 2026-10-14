
chat_prompt="""You are an AI assistant designed to answer user queries based on the provided context.  Follow these instructions carefully:


1. Parse through all of the provided text in the context.
2. If the context contains a date, mention it in your answer.
3. Do not include any information that is not explicitly provided in the context.  Do not hallucinate or make assumptions.
4. Answer the query accurately.
5. Synthesize a descriptive answer to the question, presenting the information in point form.
6. pay attention to checked and unchecked points within the transcript. Treat these points as they are presented (checked or unchecked)

Query: {query}

Context: {context}"""


chat_prompt_reference_entity_transcript="""You are an AI assistant tasked with answering a specific question based on provided textual information. Your response should be comprehensive, accurate, and strictly based on the given context.  Do not include any information not present in the provided text.

**Instructions:**

1. Carefully analyze the provided transcript and extracted entities.
2. Synthesize a descriptive answer to the question, presenting the information in point form.
3. If dates are mentioned in the text, ensure they are included in your answer.
4. Do not add any information from outside the provided context.
5. Pay attention to checked and unchecked points within the transcript. Treat these points as they are presented (checked or unchecked)


**Question:**
{question}

**Content for Reference:**

* **Transcript:**
```
{transcript}
```

* **Extracted Entities:**
```
{entity}
```

**Your Response:**
"""

filter_relivant_canned_questions="""Refer to this transcript {transcript} and here is the list of questions that may or may not be 
    relivant {questions} Yout task is to filter the provided questions and group these questions into relivant and irrelevant 
    A question would be relivant when the transcript has some information present about this question  
    provide me response in this format :
    {
    "relivant":["question3","question4"],
    "irrelevant":["question1","question2"]
    }
    remember the list can be empty as well , depending upon relivance 
    Consider all the questions , do not miss any question

    if no questions are provided then simply return this 
    {
    "relivant":[],
    "irrelevant":[]
    }
    """


extract_entity_types="""You are a PDF processing expert. Your task is to divide a PDF into batches of pages according to the following rules:

1. **Maximum Batch Size:** Each batch can contain a maximum of 1 pages.
2. **Logical Division:** Data under the same super header must stay together in the same batch.There can be multiple super headers in same batch.Have minimum number of batches
3. **Header Handling:** If the content under a header spans more than 1 pages, include the page number where the header appears in the current batch. 
Subsequent pages under the same header will be included in the next batch.

**Steps:**


1. Divide the pages into batches, ensuring that data under the same header stays together.
2. Try to form minimum number of batches
3. If a header's content exceeds 1 pages, split the content across multiple batches, including the header's page number in the first batch.
4. Mention the type of elements present in the created pdf chunk by considering these rules
    *Rules in type of element - defination * format :
    {entity_type_extraction_prompt}
5. Make sure you dont miss any type of element
Response should be in this format only :

{
    "1": 
        {
        "types":["table","circle",....],**the types of elements present in batch**
        "pages":[1] **page numbers in batch**
        },
    "2": 
        {
        "types":["image",....],
        "pages":[5]
        }
}
Now provide me pdf batches:

"""


verify_json="""
You have been provided with a json which has some formatting error , your task is to convert it into correct json format

here is the incorrect json data 
{content}
"""



dynamic_prompt_tempelate="""you have been given a medical analysis form which is filled by different medical professionals manually, 
your task is to transcribe these forms from images into text
**selection elements ** pay very close attention in differentiating if the selection elements are checked or unchecked

**For the transcription:**

1. **Accurate Transcription:** Transcribe the text from the PDF without adding or modifying any text.

2. **Detailed Summary:** For each page, provide a comprehensive summary of the doctor's analysis. Include all relevant medical terms and labels applicable to the patient.

3. **Include page headers , form names and page subheader descriptions **



***The transcript should be as detailed as possible covering all the analysis made by the doctor in the form***

{prompt}

**Output:** I want a complete transcript of the PDF in JSON format.
Every page tanscription should start with page number
provide detailed tanscript in this format - 
{
    "page number":"2" **page number,
    "transcript":{
    **nested json transcript for all elements ,
    "table":""**table contents row wise in string
    }
}


the PDF that is provided is a chunk of large PDF , These are the page numbers for the PDF provided:
{pages}

"""

agent_controller_prompt= """You are a controller responsible for determining the appropriate reference for answering a question. You will receive a question and a set of extracted entities with corresponding page numbers.
 Your task is to analyze the question and entities and decide whether the extracted entities contain sufficient information to answer the question or if referring to the complete PDF transcript is necessary.

Follow these steps:

1. Analyze the provided question.
2. Examine the provided extracted entities and their associated page numbers.
3. Determine if the information within the extracted entities is sufficient to answer the completae question accurately.
4. do not consider NA as page numbers simply ignore of NA is mentioned as  page numebrs
4. If the extracted entities are sufficient, output a JSON object in the following format:
```json
{
  "reference": ["entities"],
  "page_numbers": [/* list of page numbers mentioned in the extracted entities related to the question provided */] else []
}
```
The `page_numbers` list should contain all page numbers from the extracted entities that are relevant to the question.

5. If the extracted entities are NOT sufficient to answer the compleate question accurately, and referral to the complete transcript of the document is necessary to provide a compleate answer, output a JSON object in the following format:
```json
{
  "reference": ["transcript"]
}
```
6. If refering both extracted entities and transcript would be required to answer the question accurately , output a JSON object in the following format:
```json
{
  "reference": ["entities","transcript"],
  "page_numbers": [/* list of page numbers mentioned in the extracted entities related to the question provided */]
}
```

Remember if page numbers are not provided then return blank array like -  []

Question: {question}

Extracted Entities: {extracted_entities}  """




extract_information="""You are a "Medical Information Extractor." Your task is to analyze the provided medical analysis transcript and extract maximum information possible of the following information in JSON format:

* Signs and Symptoms -
    * Signs are objective observations (e.g., rash, fever). Symptoms are subjective experiences reported by the patient (e.g., fatigue, pain).
    * Extract signs and symptoms from sections with keywords like: "Patient presents with," "complains of," "reports," "states," "chief complaint," "describes," "endorses," "notes," "CO (complain of)," "CC (Chief complaint)," "Review of Systems," "ROS" (and include this overarching heading as the 'section' in the JSON output), and semantically similar phrases. Exclude family-related signs and symptoms information and focus solely on patient-related signs and symptoms.
    * Consider anything signifying any type of pain as a sign/symptom.
    * Negative signs and symptoms: It is crucial to accurately capture negations when extracting signs and symptoms. Consider checked or positive symptoms as "reported symptoms" and negative signs as "denied symptoms" and explicitly mention them in the output. Keep the entities descriptive and extract information as much as possible. Pay very close attention to headings and subheadings while analyzing positive and negative signs and symptoms.* Physical Examination
* Medical History
* Examination History
*ICD Codes
*CPT Codes


Include the date for all entities. If no date is provided, use "NA" as a placeholder.  For each piece of information extracted, include the page number where it was found in the transcript. Extract any date information associated with each entity. 

If any of these entities are not found in the report, use "NA" as the value for that entity in the JSON output.

The transcript will be provided in JSON format, organized by pages and nested information. Elements in the transcript may contain checkboxes. Explicitly mention if the elements are reported or denied depending on whether they are checked or unchecked.

Be as descriptive as possible when extracting information for each entity.  Page numbers are mentioned in the transcript; each page transcript starts with the page number followed by the content on that page.

Output the extracted information in the following JSON format:
```json
{
  "Signs and Symptoms": [
   {**date**:
    {**pagenumber**:{"reported symptom":[....],"denied symptoms":[....]},**pagenumber**:{"reported symptoms":[....],"denied symptoms":[....]}
  }
  ],
  .......
  "ICD codes": [**mention the form name from where this is extracted**
   {**date**:
   {**pagenumber**:[....],**pagenumber**:[....]}
  }
  ],
  "CPT codes": [**mention the form name from where this is extracted**
   {**date**:
   {**pagenumber**:[....],**pagenumber**:[....]}
  }
  ],
}
```

for example:
```json
{
  "Signs and Symptoms": [
   {"9/26/24":
    {1:{"reported symptom":[Symptom1:description if any,Symptom2:description if any]},2:[Symptom1,Symptom2:description if any]}
  }
  ],
  ..........
}

Extract as much information as possible in the compleate transcript and be descriptive 
Medical Analysis Transcript (JSON format):
{transcript}

"""


generate_questions_prompts="""You are an AI assistant designed to help doctors formulate relevant questions when analyzing medical documents.  
You will be provided with the following information:

1. **Mostly Asked Questions:** A list of questions this doctor frequently asks.
2. **Recently Asked Questions:** A list of questions the doctor has asked recently.
3. **Transcript:** A transcript of a relevant conversation.

Your task is to analyze these inputs and generate a list of *new* questions the doctor might find helpful when reviewing the document.  
These questions should be relevant to the information provided and should not duplicate existing questions.

**Instructions:**

1. Carefully review all input data: mostly asked questions, recently asked questions, the transcript.
2. Identify key themes, topics, and potential areas of inquiry based on the analysis document and the provided context.
3. Formulate a list of new, relevant questions that the doctor could ask to the aisstant.  These questions should aim to clarify information.
4. Format your output as a JSON object with a single field "questions" containing an array of strings, where each string is a new question.

**Example:**

```json
{
  "questions": [
    "Given the elevated levels of X, should we consider further testing for Y?",
    "Is the patient's current medication Z potentially contributing to the observed findings?",
    "Is this home sleep study or monitored sleep study?"
  ]
}
```

**Input Data:**

* Mostly Asked Questions:
{mostly_asked_questions}

* Recently Asked Questions:
{recently_asked_questions}

* Transcript:
{transcript}
"""


additional_prompt_for_pdf_batching="""This PDF is a batch of large pdf ,
The last batch number processed is 
{last_batch_info}
so continue ahead from this batch do not repeat this batch number and page :"""



get_transcript="""Transcribe the audio file , The audio file is essentially question which the Doctor has asked to AI aisstant
provide me response in this format :
{
"transcript":**add here the transcript , if no audio found then simply return empty string**
}
 """
