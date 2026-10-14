from google import genai
from google.genai import types
from app.utils.logger_config import get_logger
import time
import config
_config = config.get_config()
 
class GeminiAPI:
    def __init__(self, api_key: str=_config.get('gemini').get('api_key'), temperature: float = _config.get('gemini').get('temperature')):
        """
        Initialize Gemini API client with the new Google Gen AI SDK
        
        Args:
            api_key (str): Your Gemini API key
            temperature (float): Temperature for response generation (0-2)
        """
        gcp = _config.get('gcp', {})
        if str(gcp.get('use_vertex', 'false')).strip().lower() == 'true':
            # Vertex AI uses the Google Cloud project and Application Default Credentials, no API key
            self.client = genai.Client(vertexai=True, project=gcp.get('project_id') or None, location=gcp.get('location') or 'us-central1')
        else:
            self.client = genai.Client(api_key=api_key)
        self.temperature = temperature
        self.logger = get_logger(__name__)


    def upload_video_to_gemini(self, file_path):
        """
        Uploads a video file to the Gemini API and waits for it to be processed.

        This method handles the asynchronous nature of file uploads to Gemini,
        where a file is first uploaded and then undergoes a processing phase
        before it can be used.

        Args:
            file_path (str): The local file system path to the video file to be uploaded.

        Returns:
            gemini_api_client.File or None: An object representing the uploaded and
                                            processed file on the Gemini platform if successful.
                                            Returns None if an error occurs during upload or processing.

        Raises:
            ValueError: If the Gemini API reports that the video file processing failed.
        """
        try:
            video_file = self.client.files.upload(file=file_path)
            
            # Wait for processing
            while video_file.state.name == "PROCESSING":
                time.sleep(5)
                video_file = self.client.files.get(name=video_file.name)
            
            if video_file.state.name == "FAILED":
                raise ValueError(f"Video file processing failed: {video_file.name}")
            
            return video_file
            
        except Exception as e:
            self.logger.error(f"Error uploading video: {e}")
            return None
    
    def delete_gemini_file(self, file_name):
        """
        Deletes an uploaded file from the Gemini API.

        This is important for managing storage and adhering to data retention policies,
        especially for temporary files used in evaluations.

        Args:
            file_name (str): The name (ID) of the file on the Gemini platform to be deleted.
                             This is typically obtained from the `name` attribute of the
                             File object returned by `upload_video_to_gemini`.

        Returns:
            bool: True if the file was successfully deleted, False otherwise.
        """
        try:
            self.client.files.delete(name=file_name)
            return True
            
        except Exception as e:
            self.logger.error(f"Error deleting file: {e}")
            return False
        
    def get_gemini_response(self, prompt, model: str = _config.get('gemini').get('model')) -> str:
        """
        Get response from Gemini model with thinking budget disabled
        
        Args:
            prompt: Input prompt for the model
            model (str): Model name to use
            
        Returns:
            str: Generated response or None if error
        """
        try:
            config = types.GenerateContentConfig(
                temperature=self.temperature,
                thinking_config=types.ThinkingConfig(thinking_budget=0)
            )

            response = self.client.models.generate_content(
                model=model,
                contents=prompt,
                config=config
            )
            self.logger.info("Got gemini response successfully")
            return response.text
        except Exception as e:
            self.logger.error(f"Google API Error occurred while getting Gemini response: {e}")
            return None
        except ValueError as e:
            self.logger.error(f"ValueError occurred while getting Gemini response: {e}")
            return None
        
    def get_gemini_response_with_gemini(self, prompt, model: str = _config.get('gemini').get('model')) -> str:
        """
        Get response from Gemini model with thinking budget disabled
        
        Args:
            prompt: Input prompt for the model
            model (str): Model name to use
            
        Returns:
            str: Generated response or None if error
        """
        try:
            config = types.GenerateContentConfig(
                temperature=self.temperature,
                thinking_config=types.ThinkingConfig(thinking_budget=0),  
                tools=[types.Tool(google_search=types.GoogleSearch())]
            )
            
            response = self.client.models.generate_content(
                model=model,
                contents=prompt,
                config=config
            )
            self.logger.info("Got gemini response successfully")
            return response.text
        except Exception as e:
            self.logger.error(f"Google API Error occurred while getting Gemini response: {e}")
            return None
        except ValueError as e:
            self.logger.error(f"ValueError occurred while getting Gemini response: {e}")
            return None

    def generate_json(self, prompt, model: str = None, temperature: float = None, timeout: int = 10):
        """Schema-free JSON mode: returns the raw JSON text or None on any failure (caller validates with Pydantic)."""
        try:
            cfg = types.GenerateContentConfig(
                temperature=self.temperature if temperature is None else temperature,
                response_mime_type="application/json",
                http_options=types.HttpOptions(timeout=timeout * 1000),
            )
            response = self.client.models.generate_content(
                model=model or _config.get('gemini').get('model'), contents=prompt, config=cfg
            )
            return response.text
        except Exception as e:
            self.logger.error(f"Gemini JSON call failed: {e}")
            return None

    def embed(self, texts, model: str = None):
        """Embeddings for a list of strings."""
        response = self.client.models.embed_content(
            model=model or _config.get('gemini').get('embedding_model'), contents=list(texts)
        )
        return [list(e.values) for e in response.embeddings]
